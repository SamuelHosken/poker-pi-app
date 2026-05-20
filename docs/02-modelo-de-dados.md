# 02 — Modelo de Dados

> Schema do banco. **Mudanças aqui exigem migration nova, nunca editar tabela existente.**

---

## Visão geral das relações

```
auth.users (Supabase Auth)
    ↓ 1:N
events
    ├── 1:N → blind_levels
    ├── 1:N → physical_tables
    ├── 1:N → players
    ├── 1:N → matches
    └── 1:N → action_log

physical_tables
    └── 1:N → matches

matches
    ├── 1:N → participations
    └── N:1 → blind_levels (current_level_id)

players
    └── 1:N → participations
```

---

## Tabela: `events`

Representa um torneio (uma noite).

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `name` | text | NOT NULL | "Poker Pi — 23 de Maio" |
| `event_date` | timestamptz | NOT NULL | Data e hora prevista do início |
| `buy_in_cents` | integer | NOT NULL | Em centavos: 2500 = R$25 |
| `rebuy_cents` | integer | NULL | NULL = não tem rebuy |
| `rebuy_limit_per_player` | integer | DEFAULT 1 | Quantos rebuys cada jogador pode usar |
| `rebuy_until_level` | integer | DEFAULT 3 | Aceita rebuy só até esse nível |
| `table_size` | integer | DEFAULT 8 | Capacidade ideal por mesa |
| `number_of_physical_tables` | integer | DEFAULT 2 | Quantas mesas físicas |
| `state` | text | NOT NULL, DEFAULT 'SETUP' | enum textual |
| `admin_user_id` | uuid | FK → auth.users(id) | Quem criou |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**Estados válidos:** `SETUP`, `CREDENCIAMENTO`, `EM_ANDAMENTO`, `MESA_FINAL`, `ENCERRADO`

**Validação:** transições só permitidas via função SQL ou Server Action (não direto via UPDATE).

---

## Tabela: `blind_levels`

Estrutura de blinds. Múltiplos níveis por evento.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `event_id` | uuid | FK → events(id) ON DELETE CASCADE | |
| `level_number` | integer | NOT NULL | 1, 2, 3... |
| `small_blind` | integer | NOT NULL | Valor em fichas |
| `big_blind` | integer | NOT NULL | Valor em fichas |
| `ante` | integer | DEFAULT 0 | Ante (geralmente 0 nos primeiros níveis) |
| `duration_minutes` | integer | NOT NULL | Quanto dura esse nível |
| `is_final_table` | boolean | DEFAULT false | Se true, é da estrutura especial da mesa final |
| `created_at` | timestamptz | DEFAULT now() | |

**Unique constraint:** `(event_id, level_number, is_final_table)`

**Razão de `is_final_table`:** mesa final pode ter estrutura própria (mais lenta). Mesmo evento tem 2 conjuntos de níveis: classificatórias e final.

---

## Tabela: `physical_tables`

Mesa física real. Permanente durante o evento.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `event_id` | uuid | FK → events(id) ON DELETE CASCADE | |
| `table_number` | integer | NOT NULL | 1, 2, ... |
| `state` | text | NOT NULL, DEFAULT 'LIVRE' | enum |
| `created_at` | timestamptz | DEFAULT now() | |

**Estados:** `LIVRE`, `JOGANDO`, `PAUSADA`, `FINALIZADA`
**Unique:** `(event_id, table_number)`

---

## Tabela: `players`

Participantes do evento.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `event_id` | uuid | FK → events(id) ON DELETE CASCADE | |
| `name` | text | NOT NULL | Nome completo |
| `nickname` | text | NULL | Apelido (mostrado na TV se preencher) |
| `phone` | text | NULL | Pra V2 do WhatsApp |
| `player_token` | text | NOT NULL, UNIQUE | URL pessoal: `/player/[token]` |
| `state` | text | NOT NULL, DEFAULT 'INSCRITO' | enum |
| `has_paid_buyin` | boolean | DEFAULT false | |
| `rebuys_used` | integer | DEFAULT 0 | Quantos rebuys já usou |
| `final_position` | integer | NULL | Posição final no torneio (1 = campeão) |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**Estados:** `INSCRITO`, `PRESENTE`, `CHAMADO`, `JOGANDO`, `ELIMINADO`, `CLASSIFICADO`, `NA_FINAL`, `CAMPEAO`, `VICE`, `TERCEIRO`, `OUTROS_FINALISTAS`

**player_token:** gerado via `nanoid()` ou similar. Token de ~12 caracteres, suficiente pra evento entre amigos.

---

## Tabela: `matches`

Cada instância de partida em uma mesa física.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `event_id` | uuid | FK → events(id) ON DELETE CASCADE | |
| `physical_table_id` | uuid | FK → physical_tables(id) | |
| `match_number` | integer | NOT NULL | Ordem global no evento |
| `is_final_table` | boolean | DEFAULT false | Se é a mesa final |
| `state` | text | NOT NULL, DEFAULT 'LIVRE' | enum |
| `current_level_id` | uuid | FK → blind_levels(id), NULL | Nível atual |
| `level_started_at` | timestamptz | NULL | Quando o nível atual começou |
| `paused_at` | timestamptz | NULL | Se está pausada, quando pausou |
| `total_paused_ms` | bigint | DEFAULT 0 | Tempo acumulado de pausa |
| `winner_player_id` | uuid | FK → players(id), NULL | Vencedor (se finalizada) |
| `started_at` | timestamptz | NULL | Início da partida |
| `finished_at` | timestamptz | NULL | Fim da partida |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**Estados:** `LIVRE`, `JOGANDO`, `PAUSADA`, `FINALIZADA`

### Cálculo do cronômetro (CRÍTICO)

O cliente calcula o tempo restante do nível com:

```
agora = Date.now()
duracao_ms = current_level.duration_minutes * 60_000
tempo_decorrido = agora - level_started_at - total_paused_ms

se state === 'PAUSADA':
    tempo_decorrido = paused_at - level_started_at - total_paused_ms

tempo_restante = duracao_ms - tempo_decorrido
```

Quando `tempo_restante <= 0`, **o servidor** (via cron ou trigger) avança pro próximo nível, atualizando `current_level_id` e `level_started_at`, e zerando `total_paused_ms`.

---

## Tabela: `participations`

Registro de um jogador numa partida específica.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `match_id` | uuid | FK → matches(id) ON DELETE CASCADE | |
| `player_id` | uuid | FK → players(id) | |
| `seat_number` | integer | NULL | Cadeira na mesa (1-8) |
| `final_position` | integer | NULL | 1 = vencedor; 8 = primeiro eliminado |
| `eliminated_at` | timestamptz | NULL | Quando saiu |
| `rebought` | boolean | DEFAULT false | Se essa participação foi via rebuy |
| `created_at` | timestamptz | DEFAULT now() | |

**Unique:** `(match_id, player_id)` — jogador só aparece uma vez por partida.

**Observação:** se jogador faz rebuy, **nova participação** é criada (numa nova ou mesma partida, dependendo do fluxo). A definir exatamente na Etapa 4.

---

## Tabela: `action_log`

Log de ações reversíveis. Pra implementar "desfazer".

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | uuid | PK | |
| `event_id` | uuid | FK → events(id) ON DELETE CASCADE | |
| `action_type` | text | NOT NULL | enum: ELIMINATE_PLAYER, FINISH_MATCH, etc |
| `payload` | jsonb | NOT NULL | Dados necessários pra desfazer (estados antes da ação) |
| `created_at` | timestamptz | DEFAULT now() | |
| `reverted_at` | timestamptz | NULL | Se foi desfeita, quando |

**Tipos de ação:**
- `ELIMINATE_PLAYER` — desfaz: jogador volta JOGANDO, partida ganha jogador
- `FINISH_MATCH` — desfaz: partida volta JOGANDO, vencedor volta JOGANDO
- `ASSIGN_SEAT` — desfaz: remove participação criada
- `START_MATCH` — desfaz: partida volta LIVRE, jogadores voltam PRESENTE
- (mais a definir conforme implementar)

---

## Índices

```sql
-- Performance em consultas frequentes
CREATE INDEX idx_events_state ON events(state);
CREATE INDEX idx_events_admin_user ON events(admin_user_id);

CREATE INDEX idx_blind_levels_event ON blind_levels(event_id, is_final_table, level_number);

CREATE INDEX idx_physical_tables_event ON physical_tables(event_id, table_number);

CREATE INDEX idx_players_event_state ON players(event_id, state);
CREATE INDEX idx_players_token ON players(player_token);

CREATE INDEX idx_matches_event ON matches(event_id, state);
CREATE INDEX idx_matches_physical_table ON matches(physical_table_id);

CREATE INDEX idx_participations_match ON participations(match_id);
CREATE INDEX idx_participations_player ON participations(player_id);

CREATE INDEX idx_action_log_event ON action_log(event_id, created_at DESC);
```

---

## Row Level Security (RLS)

Habilitada em todas as tabelas.

### Política geral

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `events` | Público (TV/jogador leem) | Apenas admin dono (`admin_user_id = auth.uid()`) |
| `blind_levels` | Público | Apenas admin do evento |
| `physical_tables` | Público | Apenas admin do evento |
| `players` | Público | Apenas admin do evento |
| `matches` | Público | Apenas admin do evento |
| `participations` | Público | Apenas admin do evento |
| `action_log` | Apenas admin | Apenas admin |

**Importante:** "público" significa que **qualquer um com a URL** pode ler. Isso é OK porque a TV e o jogador precisam dessa leitura, e não há dado sensível (sem PII real, sem dados financeiros).

---

## Triggers e funções SQL

A definir nas etapas, mas previsivelmente:

1. **Função `transition_event_state(event_id, new_state)`** — valida transições.
2. **Função `transition_match_state(match_id, new_state)`** — valida transições.
3. **Trigger em `players`** — quando state muda, atualiza `updated_at`.
4. **Função `advance_blind_level(match_id)`** — avança nível, atualiza `level_started_at`.
5. **Função/cron** — verificador periódico que avança níveis quando tempo acaba (a definir: edge function? polling no servidor? trigger?). Decisão técnica da Etapa 2.

---

## Tipos TypeScript derivados

Gerados via:
```bash
supabase gen types typescript --linked > lib/types/database.types.ts
```

Em cima disso, criar `lib/types/domain.ts` com tipos mais legíveis:

```ts
export type EventState = 'SETUP' | 'CREDENCIAMENTO' | 'EM_ANDAMENTO' | 'MESA_FINAL' | 'ENCERRADO';
export type MatchState = 'LIVRE' | 'JOGANDO' | 'PAUSADA' | 'FINALIZADA';
export type PlayerState = 'INSCRITO' | 'PRESENTE' | 'CHAMADO' | 'JOGANDO' | 'ELIMINADO' | 'CLASSIFICADO' | 'NA_FINAL' | 'CAMPEAO' | 'VICE' | 'TERCEIRO';
// ...
```

---

## Diagrama ER (textual)

```
┌──────────────┐
│  auth.users  │
└──────┬───────┘
       │ admin_user_id
       ▼
┌──────────────┐       ┌──────────────────┐
│   events     │───────│  blind_levels    │
└──┬─────┬─────┘       └──────────────────┘
   │     │
   │     │              ┌──────────────────┐
   │     └──────────────│ physical_tables  │
   │                    └─────────┬────────┘
   │                              │
   │     ┌──────────────┐         │
   ├─────│   players    │         │
   │     └──────┬───────┘         │
   │            │                 │
   │            │                 ▼
   │            │         ┌──────────────┐
   │            │         │   matches    │
   │            │         └──────┬───────┘
   │            │                │
   │            ▼                ▼
   │     ┌─────────────────────────┐
   │     │     participations      │
   │     └─────────────────────────┘
   │
   ▼
┌──────────────┐
│  action_log  │
└──────────────┘
```

---

*Próximo passo: ler `03-padroes-tecnicos.md` para entender as convenções de código.*
