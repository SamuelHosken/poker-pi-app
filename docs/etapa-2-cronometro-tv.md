# Etapa 2 — Cronômetro Server-Side + TV Básica

> Implementa a coisa mais importante do produto: o cronômetro funcionando de verdade, sincronizado em tempo real entre admin e TV.

---

## Pré-requisitos

- ✅ Etapa 1 concluída e validada
- ✅ Mergeada na main

---

## Branch nova

```bash
git checkout main && git pull
git checkout -b etapa-2-cronometro-tv
```

---

## Prompt para o Claude Code

```
Leia o CLAUDE.md, docs/00 ao 03, e docs/etapa-1-fundacao.md. Esta é a
Etapa 2.

ETAPA 2: Cronômetro server-side + TV pública básica.

## Objetivo

Implementar o coração do produto: cronômetro de partida controlado pelo
servidor (regra inviolável), sincronizado em tempo real via Supabase
Realtime entre admin e TV. Ao final, eu devo conseguir abrir a TV num
navegador e ver o cronômetro de uma partida descontando em tempo real
enquanto opero pelo admin em outro navegador.

## Tarefas

### 1. Funções puras de tempo
Crie lib/timer/calculate.ts com:

```ts
import type { Database } from '@/lib/types/database.types';
type Match = Database['public']['Tables']['matches']['Row'];
type BlindLevel = Database['public']['Tables']['blind_levels']['Row'];

export function calculateTimeRemainingMs(
  match: Pick<Match, 'state' | 'level_started_at' | 'paused_at' | 'total_paused_ms'>,
  level: Pick<BlindLevel, 'duration_minutes'>
): number {
  if (!match.level_started_at) return 0;

  const durationMs = level.duration_minutes * 60_000;
  const levelStarted = new Date(match.level_started_at).getTime();
  const totalPaused = Number(match.total_paused_ms ?? 0);

  let elapsed: number;
  if (match.state === 'PAUSADA' && match.paused_at) {
    elapsed = new Date(match.paused_at).getTime() - levelStarted - totalPaused;
  } else {
    elapsed = Date.now() - levelStarted - totalPaused;
  }

  return Math.max(0, durationMs - elapsed);
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60).toString().padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
```

Adicione testes simples (Jest ou Vitest) em lib/timer/calculate.test.ts:
- timer JOGANDO retorna tempo correto
- timer PAUSADA congela
- timer com total_paused_ms desconta corretamente
- timer retorna 0 quando tempo acabou

### 2. Server Actions de match
Crie lib/tournament/matches.ts:

- startMatch(matchId, playerIds[]) — sai LIVRE → JOGANDO. Define
  current_level_id (primeiro nível NÃO is_final_table), level_started_at = now,
  cria participations com seat_number sorteado aleatoriamente
- pauseMatch(matchId) — JOGANDO → PAUSADA, paused_at = now
- resumeMatch(matchId) — PAUSADA → JOGANDO, total_paused_ms += (now - paused_at), paused_at = null
- advanceLevel(matchId) — pega próximo nível. Se acabou, fica no último.
  Atualiza level_started_at = now, zera total_paused_ms.

Cada action valida transição de estado.

### 3. Edge Function pra avanço automático
Crie supabase/functions/advance-blinds/index.ts.

Função Deno que:
1. Lista todas as matches em estado JOGANDO
2. Pra cada uma, calcula tempo restante
3. Se <= 0, chama advanceLevel via RPC

Deploy:
```bash
supabase functions deploy advance-blinds
```

Configure no Dashboard pra rodar a cada 10 segundos via cron (ou via
GitHub Actions workflow que chama a function — mais simples).

ALTERNATIVA mais simples: cria uma rota /api/cron/advance-blinds no
Next.js + Vercel Cron Jobs (vercel.json com schedule). Pode ser mais
fácil.

Use o que for mais simples. Documente a escolha.

### 4. Página TV pública
app/(public)/tv/[eventId]/page.tsx (Server Component que busca evento
+ matches + levels).

Layout fullscreen, tema dark Poker Pi:

- Topo: nome do evento + estado em badge
- Centro: duas colunas (uma por mesa física)
  Cada coluna mostra:
  - Número da mesa: "Mesa 1" / "Mesa 2"
  - Estado da partida (LIVRE / JOGANDO / PAUSADA / FINALIZADA) — badge colorido
  - Cronômetro grande no centro (formato MM:SS, fonte mono, ~120px)
  - Blinds atuais: "SB / BB" em fonte grande
  - Nível atual: "Nível X"
  - Próximos blinds (em fonte menor abaixo)
  - Lista de jogadores na mesa (apenas nomes)
- Rodapé: contagem de classificados, jogadores na fila

Quando match.state === 'LIVRE', mostra placeholder ("Mesa aguardando partida").

### 5. Cronômetro client component com Realtime
components/tv/match-timer.tsx ('use client'):

```tsx
'use client';
export function MatchTimer({ matchId, initialMatch, level }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [_, setTick] = useState(0);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setMatch(payload.new as Match)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Tick a cada segundo só pra forçar re-render
  useEffect(() => {
    if (match.state !== 'JOGANDO') return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [match.state]);

  const remainingMs = calculateTimeRemainingMs(match, level);
  return <div className="font-mono text-9xl">{formatTime(remainingMs)}</div>;
}
```

### 6. Painel admin pra controlar uma partida
Em /admin/events/[id], adicione (quando estado === EM_ANDAMENTO):

- Pra cada mesa física, um card com:
  - Estado
  - Botão "Iniciar partida" (se LIVRE) → abre modal pra escolher 8 jogadores PRESENTE
  - Botão "Pausar" / "Retomar" (toggle)
  - Botão "Avançar nível" (debug, manual)

Use a mesma subscription Realtime pra atualizar o admin quando match muda.

### 7. Botão de cadastro rápido de jogador
Em /admin/events/[id], na fase CREDENCIAMENTO, formulário simples:
- Nome
- Botão "Adicionar e marcar como PRESENTE"

Server Action: createPlayer(eventId, name) — cria player com state='PRESENTE',
gera player_token via nanoid(12).

Adicione button "Avançar pra EM_ANDAMENTO" quando há >= 16 players PRESENTE.

### 8. Commit
git commit -m "feat(etapa-2): cronômetro server-side + tv básica + controle de partida"

## Restrições

- NÃO mexer na lógica de fila/renovação ainda (Etapa 4)
- NÃO implementar mesa final ainda (Etapa 5)
- NÃO criar animações ou sons ainda (Etapa 6)
- Cronômetro NUNCA com setInterval controlando o tempo — só pra re-render

## Critérios de aceitação

1. npm run build passa, tsc --noEmit passa, lint passa
2. Crio evento, adiciono 16 jogadores, avanço pra EM_ANDAMENTO
3. Clico "Iniciar partida" na Mesa 1, escolho 8 jogadores
4. Cronômetro começa a descontar
5. Abro /tv/[eventId] em outra aba → vejo o cronômetro descontando
   sincronizado com o admin
6. Pauso pelo admin → TV também pausa (vejo state PAUSADA)
7. Retomo → cronômetro continua de onde parou (não reseta)
8. Quando nível acaba, sistema avança pro próximo nível automaticamente
   E TV reflete sem refresh
9. Atualizo a página TV → cronômetro mostra tempo correto (não reseta)
10. ZERO uso de any

## Ao final

Atualize CLAUDE.md, marque etapa 2 como concluída.
Mostre comandos pra validar.
```

---

## Validação manual

```bash
npm run build
npx tsc --noEmit
npm run lint
grep -rn ": any" --include="*.ts" --include="*.tsx" lib/ app/ components/

# Testes
npm test
```

### Checklist

- [ ] Cronômetro desconta corretamente no admin
- [ ] TV sincroniza em tempo real (delay < 1s)
- [ ] Pausa funciona em ambos
- [ ] Retomar continua do tempo correto
- [ ] Nível avança automaticamente
- [ ] Refresh da TV mostra tempo correto
- [ ] Testes passam

---

## Prompt de validação

```
Leia CLAUDE.md. Vamos auditar Etapa 2:

1. O cronômetro tem algum setInterval controlando o tempo? Mostre código.
2. Como o avanço automático de nível é disparado? Cron, edge function ou outro?
3. As subscriptions Realtime estão sendo limpas corretamente no cleanup?
4. Há race conditions possíveis em pause/resume? Como protege?
5. Se internet cair na TV, o que acontece? Reconecta automaticamente?
6. As funções de calculate.ts têm testes? Quantos casos?
7. revalidatePath está chamado em todas as actions de match?
8. Quando admin pausa, qual é a sequência de eventos pra TV refletir?
9. transitionMatchState valida transições?
10. Algum any no código novo?
```

---

*Próximo: `etapa-3-admin-partida.md`*
