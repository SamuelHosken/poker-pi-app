# 03 — Padrões Técnicos

> Convenções de código, padrões de arquitetura, e como resolver problemas comuns no contexto deste projeto.

---

## 1. TypeScript estrito

`tsconfig.json` precisa ter:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Regras absolutas:**
- ❌ `any` está proibido
- ❌ `as unknown as Foo` é proibido (raras exceções com comentário justificando)
- ✅ Use `unknown` quando o tipo é genuinamente desconhecido e narrow com `zod` ou type guards
- ✅ Use tipos derivados do schema Supabase, não inventados à mão

---

## 2. Server Components vs Client Components

**Regra:** Server Component é o padrão. `'use client'` é exceção.

### Use Server Component quando:
- Componente só renderiza dados (sem interação)
- Você precisa fazer fetch de dados (`async function`)
- Não tem estado local (`useState`) nem efeitos (`useEffect`)
- Não tem event handlers (`onClick`, `onChange`)

### Use Client Component (`'use client'`) quando:
- Tem estado local (`useState`, `useReducer`)
- Tem event handlers
- Usa hooks de cliente (`useRouter`, `useSearchParams`)
- Precisa de Realtime (subscription do Supabase)

### Padrão de composição

Quando precisa de interação dentro de uma página server-rendered:

```
app/admin/events/[id]/page.tsx          ← Server Component (fetch)
  └── components/admin/event-detail.tsx ← Server Component (display)
       └── components/admin/edit-button.tsx ← 'use client' (interação)
```

**Não** marque o componente pai inteiro como `'use client'` só porque tem um botão dentro.

---

## 3. Server Actions

Use Server Actions pra **toda mutação**. Não crie rotas API à toa.

### Estrutura padrão

`lib/tournament/events.ts`:
```ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const CreateEventSchema = z.object({
  name: z.string().min(1).max(100),
  eventDate: z.string().datetime(),
  buyInCents: z.number().int().positive(),
  // ...
});

export async function createEvent(input: unknown) {
  const data = CreateEventSchema.parse(input);
  const supabase = await createServerClient();

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      name: data.name,
      event_date: data.eventDate,
      buy_in_cents: data.buyInCents,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);

  revalidatePath('/admin/events');
  return event;
}
```

**Regras:**
- ✅ Sempre validar input com Zod
- ✅ Sempre lidar com erro do Supabase
- ✅ Chamar `revalidatePath` ou `revalidateTag` quando muda dados
- ❌ Não retornar funções ou tipos complexos (Server Actions serializam)

---

## 4. Cliente Supabase

Três variações dependendo do contexto:

### Server-side (Server Components + Server Actions)
`lib/supabase/server.ts`:
```ts
import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component, ignore */ }
        },
      },
    }
  );
}
```

### Browser-side (Client Components com Realtime)
`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Middleware
`lib/supabase/middleware.ts`:
- Refresh de sessão automático
- Redirect pra `/admin/login` se rota admin sem auth

---

## 5. Realtime patterns

Sempre que UI precisa reagir a mudanças no banco:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function MatchTimer({ matchId, initialMatch }: Props) {
  const [match, setMatch] = useState(initialMatch);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setMatch(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // ... render
}
```

**Regras:**
- ✅ Sempre passar `initialData` do Server Component pra evitar flash
- ✅ Sempre limpar subscription no cleanup do useEffect
- ✅ Filtrar via `filter:` no postgres_changes pra reduzir eventos
- ❌ Nunca subscrever sem unsubscribe (memory leak)

---

## 6. Cronômetro: a regra inviolável

**O cronômetro JAMAIS é controlado por `setInterval` no cliente.**

### Padrão correto:

**Server (banco):**
- `matches.level_started_at` = timestamp de quando o nível atual começou
- `matches.total_paused_ms` = tempo pausado acumulado
- `matches.paused_at` = se está pausado, quando pausou
- `blind_levels.duration_minutes` = duração do nível

**Cliente:**
```ts
function calculateTimeRemaining(match: Match, level: BlindLevel): number {
  const now = Date.now();
  const levelStarted = new Date(match.level_started_at).getTime();
  const durationMs = level.duration_minutes * 60_000;

  let elapsed: number;
  if (match.state === 'PAUSADA' && match.paused_at) {
    const pausedAt = new Date(match.paused_at).getTime();
    elapsed = pausedAt - levelStarted - match.total_paused_ms;
  } else {
    elapsed = now - levelStarted - match.total_paused_ms;
  }

  return Math.max(0, durationMs - elapsed);
}
```

**Pra UI atualizar a cada segundo:**
```tsx
'use client';
useEffect(() => {
  if (match.state !== 'JOGANDO') return;
  const interval = setInterval(() => {
    setTick(t => t + 1); // só força re-render
  }, 1000);
  return () => clearInterval(interval);
}, [match.state]);

const timeRemaining = calculateTimeRemaining(match, level);
```

O `setInterval` aqui **não** está controlando o cronômetro — ele só força re-render. O cronômetro real é matemática pura sobre `level_started_at`.

### Avanço automático de nível

Quando `timeRemaining <= 0`, alguma coisa precisa avançar pro próximo nível. Opções:

1. **Cron job no Supabase Edge Functions** (a cada 1s, verifica matches em JOGANDO)
2. **Trigger no banco** (mais complexo, mas mais confiável)
3. **Cliente reporta "tempo acabou"** (não confiável, mas mais simples)

**Decisão: vamos pela 1 (cron edge function) na Etapa 2.**

---

## 7. Reversibilidade (action log)

Antes de toda ação importante:

```ts
async function eliminatePlayer(matchId, playerId) {
  const supabase = await createServerClient();

  // 1. Pega estado atual (pra poder reverter)
  const beforeState = await getMatchState(matchId);

  // 2. Faz a ação
  const { error } = await supabase
    .from('participations')
    .update({ eliminated_at: new Date().toISOString(), final_position: nextPosition })
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  if (error) throw error;

  await supabase.from('players')
    .update({ state: 'ELIMINADO' })
    .eq('id', playerId);

  // 3. Registra no action_log
  await supabase.from('action_log').insert({
    event_id: eventId,
    action_type: 'ELIMINATE_PLAYER',
    payload: { matchId, playerId, beforeState },
  });

  revalidatePath(...);
}

async function undoLastAction(eventId) {
  // Pega última ação não revertida
  const { data: lastAction } = await supabase
    .from('action_log')
    .select('*')
    .eq('event_id', eventId)
    .is('reverted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Switch case por action_type, restaura estado do payload
  switch (lastAction.action_type) {
    case 'ELIMINATE_PLAYER':
      await revertElimination(lastAction.payload);
      break;
    // ...
  }

  // Marca como revertida
  await supabase.from('action_log')
    .update({ reverted_at: new Date().toISOString() })
    .eq('id', lastAction.id);
}
```

---

## 8. Validação de transições de estado

Toda transição de estado (evento, mesa, jogador) **deve ser validada**.

Em SQL (preferível) ou em Server Action:

```ts
const VALID_EVENT_TRANSITIONS: Record<EventState, EventState[]> = {
  SETUP: ['CREDENCIAMENTO'],
  CREDENCIAMENTO: ['EM_ANDAMENTO', 'SETUP'], // pode voltar pra SETUP
  EM_ANDAMENTO: ['MESA_FINAL', 'EM_ANDAMENTO'],
  MESA_FINAL: ['ENCERRADO'],
  ENCERRADO: [],
};

export async function transitionEventState(eventId: string, newState: EventState) {
  const supabase = await createServerClient();
  const { data: event } = await supabase.from('events').select('state').eq('id', eventId).single();

  if (!event) throw new Error('Event not found');

  const validNext = VALID_EVENT_TRANSITIONS[event.state as EventState];
  if (!validNext.includes(newState)) {
    throw new Error(`Invalid transition: ${event.state} → ${newState}`);
  }

  await supabase.from('events').update({ state: newState }).eq('id', eventId);
  revalidatePath(`/admin/events/${eventId}`);
}
```

---

## 9. Tratamento de erros

### No backend (Server Actions)
- Lança `Error` com mensagem em português
- Frontend captura e mostra em toast/alerta

### No frontend
```tsx
'use client';
import { toast } from 'sonner';

const handleClick = async () => {
  try {
    await createEvent(data);
    toast.success('Evento criado com sucesso');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
  }
};
```

---

## 10. Estilo de UI

### Paleta (Poker Pi)

```css
--ink: #0A0A0B;        /* background principal */
--ink-2: #131316;      /* cards, seções secundárias */
--smoke: #1A1A1C;      /* hover states */
--line: #26262A;       /* bordas */
--gray-mid: #6B6B70;
--gray-soft: #9A9A9F;
--paper: #F5F1E8;      /* texto principal */
--white: #FFFFFF;
--gold: #C9A961;       /* acento premium */
--red: #C8102E;        /* destrutivo / alerta */
--felt: #0F3D2E;       /* mesa de feltro */
```

### Tipografia

- **Display:** Fraunces (serifa editorial)
- **Body:** Geist (sans clean)
- **Mono:** Geist Mono (números, dados)

### Componentes shadcn

Use shadcn/ui como base. Customize via `tailwind.config.ts` e variáveis CSS, não overridando classes.

### Tamanho de botões no admin

Botões importantes (Eliminar, Finalizar, Pausar) **devem ter mínimo 48px de altura** e **texto claro**. Vai ser usado sob pressão.

---

## 11. Nomes em inglês no código, português na UI

```ts
// ✅ certo
async function eliminatePlayer(playerId: string) { ... }
<Button>Eliminar jogador</Button>

// ❌ errado
async function eliminarJogador(idJogador: string) { ... }
<Button>Eliminate player</Button>
```

**Por quê:** código fica idiomático e portável. UI fica natural pro usuário brasileiro.

---

## 12. Estrutura de arquivos dentro de `lib/`

```
lib/
├── supabase/
│   ├── server.ts
│   ├── client.ts
│   └── middleware.ts
├── types/
│   ├── database.types.ts  ← gerado por supabase CLI
│   ├── domain.ts          ← tipos de estado
│   └── schemas.ts         ← schemas Zod
├── timer/
│   ├── calculate.ts       ← funções puras de cálculo de tempo
│   └── format.ts          ← formatação display "MM:SS"
└── tournament/
    ├── events.ts          ← Server Actions de eventos
    ├── players.ts         ← Server Actions de jogadores
    ├── matches.ts         ← Server Actions de partidas
    ├── action-log.ts      ← logging e undo
    ├── transitions.ts     ← validação de estados
    └── blind-templates.ts ← templates prontos
```

---

## 13. Variáveis de ambiente

`.env.local` (NUNCA commitar):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # apenas server-side, NUNCA expor no cliente
```

`.env.local.example` (commitado, com valores fake):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`.gitignore` deve incluir:
```
.env.local
.env*.local
```

**Service Role Key** só pode ser usada em Server Actions/Edge Functions. **Jamais** importar no cliente.

---

## 14. Performance

### Métricas alvo
- TV: 60fps constante (animações suaves)
- Painel admin: ação → feedback visual < 100ms
- Realtime delay: < 500ms

### Como conseguir
- Server Components reduzem JS no cliente
- Subscriptions filtradas por `filter:` no postgres_changes
- Não fazer query desnecessária (use `revalidatePath` em vez de refetch manual)

---

*Fim dos padrões técnicos. Próximo passo: começar Etapa 1 — `etapa-1-fundacao.md`.*
