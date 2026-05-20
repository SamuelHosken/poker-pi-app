# Etapa 1 — Fundação (Schema + Tipos + CRUD de Evento)

> Esta é **a etapa mais crítica do projeto**. Se o schema do banco estiver errado, todas as próximas etapas sofrem retrabalho. Não pule a validação.

---

## Pré-requisitos

- ✅ Etapa 0 concluída e validada
- ✅ `CLAUDE.md` na raiz, atualizado
- ✅ Estrutura de pastas pronta
- ✅ Supabase linkado via CLI
- ✅ `.env.local` configurado

---

## Branch nova

```bash
git checkout main
git pull
git checkout -b etapa-1-fundacao
```

---

## Prompt para o Claude Code

> Cole em sessão nova. **Sempre leia o CLAUDE.md primeiro** — o prompt inicial reforça isso.

```
Leia o CLAUDE.md na raiz, leia docs/00-visao-geral.md, docs/01-decisoes-fechadas.md,
docs/02-modelo-de-dados.md e docs/03-padroes-tecnicos.md. Esses 5 arquivos são
seu contexto completo. NÃO comece a implementar antes de ler.

ETAPA 1: Fundação — schema do banco + tipos TypeScript + CRUD de evento.

## Objetivo

Estabelecer a base de dados sobre a qual todas as etapas seguintes vão construir.
Esta etapa NÃO inclui real-time, cronômetro funcional, ou UI sofisticada.
Apenas: schema correto, tipos derivados, e operações CRUD de evento funcionando.

## Tarefas

### 1. Migration SQL inicial
Crie supabase/migrations/0001_initial_schema.sql com TODAS as tabelas
descritas em docs/02-modelo-de-dados.md, exatamente conforme especificado:

- events
- blind_levels
- physical_tables
- players
- matches
- participations
- action_log

Inclua:
- TODAS as constraints (NOT NULL, DEFAULT, UNIQUE, FK com ON DELETE CASCADE)
- TODOS os índices listados em "Índices"
- RLS habilitada em todas as tabelas
- Policies conforme tabela "Política geral" em 02-modelo-de-dados.md
- Trigger pra atualizar updated_at automaticamente em events e players

### 2. Aplicar a migration
```bash
supabase db push
```
Verifique no Supabase Dashboard que todas as tabelas foram criadas.

### 3. Gerar tipos TypeScript
```bash
supabase gen types typescript --linked > lib/types/database.types.ts
```

### 4. Tipos de domínio
Crie lib/types/domain.ts com tipos legíveis:

```ts
export type EventState = 'SETUP' | 'CREDENCIAMENTO' | 'EM_ANDAMENTO' | 'MESA_FINAL' | 'ENCERRADO';
export type MatchState = 'LIVRE' | 'JOGANDO' | 'PAUSADA' | 'FINALIZADA';
export type PhysicalTableState = MatchState;
export type PlayerState = 'INSCRITO' | 'PRESENTE' | 'CHAMADO' | 'JOGANDO' | 'ELIMINADO' | 'CLASSIFICADO' | 'NA_FINAL' | 'CAMPEAO' | 'VICE' | 'TERCEIRO' | 'OUTROS_FINALISTAS';
export type ActionType = 'ELIMINATE_PLAYER' | 'FINISH_MATCH' | 'ASSIGN_SEAT' | 'START_MATCH';

// Reexportar tipos da database
export type { Database } from './database.types';
```

### 5. Schemas Zod
Crie lib/types/schemas.ts com schemas pra validação de input:

- CreateEventSchema
- UpdateEventSchema
- BlindLevelInputSchema
- (outros conforme precisar)

Use Zod com mensagens de erro em português ("Nome é obrigatório", etc).

### 6. Templates de blinds
Crie lib/tournament/blind-templates.ts com 3 templates:

```ts
export type BlindLevelTemplate = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
};

export const BLIND_TEMPLATES = {
  turbo: {
    name: 'Turbo',
    description: 'Eventos rápidos, ~2h',
    levels: [/* 10 níveis, 10 min cada, valores crescendo progressivamente */],
  },
  padrao: {
    name: 'Padrão',
    description: 'Eventos normais, ~3h',
    levels: [/* 12 níveis, 15 min cada */],
  },
  lento: {
    name: 'Lento',
    description: 'Eventos longos, ~4-5h',
    levels: [/* 15 níveis, 20 min cada */],
  },
} as const;
```

Valores realistas de poker: SB começa em 25, BB em 50. Cresce
progressivamente (não dobra a cada nível, cresce de forma mais natural).
Ante começa em 0 e aparece a partir do nível 4-5.

### 7. Validação de transições
Crie lib/tournament/transitions.ts:

```ts
export const VALID_EVENT_TRANSITIONS: Record<EventState, EventState[]> = {
  SETUP: ['CREDENCIAMENTO'],
  CREDENCIAMENTO: ['EM_ANDAMENTO', 'SETUP'],
  EM_ANDAMENTO: ['MESA_FINAL'],
  MESA_FINAL: ['ENCERRADO'],
  ENCERRADO: [],
};

export function canTransitionEvent(from: EventState, to: EventState): boolean {
  return VALID_EVENT_TRANSITIONS[from]?.includes(to) ?? false;
}

// Idem pra MatchState, PlayerState (transições válidas)
```

### 8. Server Actions de evento
Crie lib/tournament/events.ts com Server Actions:

- createEvent(input) — valida com Zod, cria evento + N mesas físicas automaticamente
  + cria níveis de blind baseado no template escolhido
- getEvent(id) — retorna evento com blind_levels e physical_tables
- listEvents() — eventos do admin atual
- updateEvent(id, updates) — só permite se state === 'SETUP'
- deleteEvent(id) — só permite se state === 'SETUP'
- transitionEventState(id, newState) — valida transição

TODAS as actions:
- Usam createServerClient
- Validam input com Zod
- Lançam Error com mensagem em português
- Chamam revalidatePath ao final

### 9. Páginas de admin (versão básica)

**app/(admin)/layout.tsx** — layout com nav simples (logo + link "Eventos")

**app/(admin)/events/page.tsx** (Server Component)
- Lista eventos do admin
- Botão "Criar evento" → linka pra /admin/events/new

**app/(admin)/events/new/page.tsx**
- Formulário com:
  - Nome (text)
  - Data (datetime-local)
  - Buy-in em R$ (number, converter pra centavos no submit)
  - Rebuy ativo? (checkbox) → se sim, mostra: valor, limite, até qual nível
  - Tamanho da mesa (default 8)
  - Número de mesas físicas (default 2)
  - Template de blinds (select: Turbo / Padrão / Lento)
- Use react-hook-form OU formulário simples com action prop e useFormState
- Submit chama createEvent action
- Em sucesso, redireciona pra /admin/events/[id]
- Em erro, mostra toast com mensagem

**app/(admin)/events/[id]/page.tsx** (Server Component)
- Mostra detalhes do evento:
  - Nome, data, buy-in
  - Estado atual (badge colorido)
  - Estrutura de blinds (tabela: nível, SB, BB, ante, duração)
  - Mesas físicas (lista com estado)
- Botão "Avançar pra Credenciamento" (se state === 'SETUP')
  → chama transitionEventState

### 10. Autenticação básica
Crie:
- app/(admin)/login/page.tsx — formulário email/senha (apenas Supabase Auth)
- app/(admin)/login/actions.ts — Server Action de login
- Atualize middleware.ts pra redirecionar pra /admin/login se rota admin sem auth

Política temporária: cadastro via Supabase Dashboard (não vamos criar
form de signup, deixa pra V2). Pode criar usuário admin na sua conta
Supabase manualmente.

### 11. README.md
Atualize README.md com:
- Descrição do projeto (1 parágrafo)
- Stack
- Setup local passo-a-passo
- Como rodar migrations
- Como gerar tipos
- Como criar usuário admin manualmente
- Estrutura de pastas (high-level)
- Onde está a documentação completa (apontar pra docs/)

### 12. Commit
git commit -m "feat(etapa-1): schema do banco, tipos, CRUD de evento"

## Restrições

- NÃO implemente real-time ainda (sem subscriptions)
- NÃO implemente cronômetro funcional ainda
- NÃO crie UI sofisticada ou animações
- NÃO crie interfaces de TV ou jogador
- NÃO use any em TypeScript
- USE Server Components por padrão
- TODA mensagem ao usuário em português

## Critérios de aceitação

Ao final desta etapa, eu devo conseguir:

1. npm run dev sem erros
2. npm run build passa
3. npx tsc --noEmit passa (zero erros)
4. Criar usuário admin no Supabase Dashboard
5. Acessar /admin/login e fazer login
6. Acessar /admin/events e ver lista vazia
7. Clicar em "Criar evento", preencher formulário, escolher template,
   submeter e ver o evento criado
8. /admin/events/[id] mostra: nome, data, buy-in, blinds completos, 2 mesas físicas
9. No Supabase Dashboard, ver as tabelas populadas corretamente
10. RLS funciona: sem login, tentar acessar dados via SQL editor com role anon
    retorna SELECT possível mas INSERT/UPDATE/DELETE bloqueado
11. ZERO uso de any no código (grep -r 'any' --include='*.ts' --include='*.tsx')

## Ao final

Atualize o CLAUDE.md marcando Etapa 1 como concluída.

Me mostre:
- Lista de arquivos criados
- Comandos pra eu validar manualmente
- Pontos de atenção que descobriu durante a implementação
- Qualquer decisão pequena que tomou e não estava no spec
```

---

## Validação manual após Claude Code terminar

Execute os comandos abaixo. **TODOS** devem passar antes de avançar.

```bash
# 1. Build
npm run build

# 2. TypeScript
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Verifica que NÃO tem any
grep -rn ": any" --include="*.ts" --include="*.tsx" lib/ app/ components/

# 5. Dev server
npm run dev
# Abrir http://localhost:3000

# 6. Migrations aplicadas
supabase db diff
# Não deve ter diff pendente
```

### Checklist manual

- [ ] Criei usuário admin no Supabase Auth (manualmente)
- [ ] Consigo fazer login em `/admin/login`
- [ ] `/admin/events` mostra lista vazia
- [ ] Criei evento com template "Padrão" — funcionou
- [ ] `/admin/events/[id]` mostra: nome, data, buy-in, 12 níveis de blind, 2 mesas
- [ ] No Supabase Dashboard, vejo a tabela `events` com 1 registro
- [ ] No Supabase Dashboard, vejo `blind_levels` com 12 registros do meu evento
- [ ] No Supabase Dashboard, vejo `physical_tables` com 2 registros
- [ ] Tentei criar evento sem login → fui redirecionado pro login
- [ ] Apertei "Avançar pra Credenciamento" → estado mudou e botão sumiu

---

## Prompt de validação (rode DEPOIS, ainda nessa branch)

Se tudo acima passou, rode este prompt no Claude Code pra ele auditar o próprio código:

```
Leia o CLAUDE.md primeiro. Vamos AUDITAR a Etapa 1 antes de merge.
Responda cada item com o trecho de código relevante.

1. Há algum uso de `any` no código? Liste todos. Se houver, justifique
   ou refatore.
2. Há console.log esquecido? Remova.
3. O cliente Supabase server-side é criado corretamente em Server
   Components vs Server Actions? Mostre os usos.
4. Todas as RLS policies estão configuradas? Faça inventário tabela
   por tabela: existe SELECT, INSERT, UPDATE, DELETE pra cada role?
5. TypeScript compila 100% (rode tsc --noEmit) — mostre output.
6. Templates de blinds: valores crescem progressivamente? Mostre o
   array de "padrao" e cole aqui pra eu conferir.
7. transitionEventState valida transições? Mostre o código.
8. Há lógica de negócio escapou pra dentro de componentes? Procure
   imports do supabase em components/ — não deve ter.
9. A modelagem permite múltiplas matches na mesma physical_table?
   Mostre como (FK + ausência de UNIQUE constraint).
10. Sem login, acessar /admin/events redireciona? Mostre o middleware.

Liste tudo fora do esperado. Quero corrigir ANTES de mergear na main.
```

---

## Merge e push

Se TUDO passou:

```bash
git checkout main
git merge etapa-1-fundacao
git push origin main
# Vercel deploya automaticamente
```

Atualize o CLAUDE.md:

```markdown
- [x] Etapa 1: Fundação ...
```

```markdown
ETAPA ATUAL: 1 (concluída)
PRÓXIMA ETAPA: 2 (Cronômetro server-side + TV básica)
```

---

*Próximo: `etapa-2-cronometro-tv.md`*
