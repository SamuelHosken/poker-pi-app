# Iteração V1.1 — Simplificação

> Data: 2026-05-21
> Branch: `iteracao-v1.1-simplificacao`
> Status: código completo, **aguardando validação E2E no browser**

---

## Contexto

Após o MVP feature-complete (etapas 0-7A na branch `etapa-1-fundacao`), entramos numa fase de simplificação preparatória pra evolução V1.2 ("salas estilo Discord"). Esta iteração corta features que não fazem mais sentido no paradigma novo, sem quebrar dados antigos.

---

## O que foi REMOVIDO

| Coisa | Arquivos deletados/neutralizados |
|---|---|
| Conceito visual de "fila de espera" | `app/admin/events/[id]/queue-section.tsx`, `lib/tournament/queue.ts` |
| Renovação de mesa | `releaseFinishedTable` removida de `matches.ts`; `startMatchOnTable` rejeita state=FINALIZADA |
| Mesa final como fase | `lib/tournament/final-table.ts` — `transitionToFinalTable` e `startFinalMatch` lançam erro; `canTransitionToFinalTable` sempre retorna `false` |
| Cron de avanço automático de blinds | `app/api/cron/advance-blinds/` deletado; `vercel.json` deletado; `CRON_SECRET` removido do `.env.local.example` |
| UI "Iniciar Mesa Final" | `app/admin/events/[id]/transition-to-final-button.tsx` deletado |
| UI "Renovar mesa" + "ou deixar livre" | Cases removidos de `match-controls.tsx` |
| UI "Finalizar mesa" (botão dourado) | `FinishMatchButton` removido de `match-players-section.tsx` |
| Dependência `next-themes` | `npm uninstall next-themes` (3KB de bundle); `components/ui/sonner.tsx` agora usa `theme="dark"` fixo |

## O que foi MODIFICADO

| Coisa | Onde |
|---|---|
| Cronômetro pode ficar negativo | `lib/timer/calculate.ts` removeu `Math.max(0, ...)`; `lib/timer/format.ts` aceita ms < 0 com prefixo "-" |
| Cor vermelha quando timer negativo | `components/tv/match-timer.tsx` |
| `eliminatePlayer` simplificado | Em `matches.ts`: removido o branch `if (match.is_final_table)` que mapeava VICE/TERCEIRO/OUTROS_FINALISTAS. Agora sempre `state = "ELIMINADO"`. `final_position` continua sendo gravado (em participations E em players — agora event-wide pra o Pódio identificar 2º, 3º). |
| `finishMatch` deprecada | `@deprecated` JSDoc; ainda exportada pra undo histórico funcionar |
| Pódio refatorado | `components/tv/podium.tsx` identifica posições por `final_position` puro, com fallback pra state legado (VICE/TERCEIRO) |
| `EM_ANDAMENTO → MESA_FINAL` substituído por `EM_ANDAMENTO → ENCERRADO` | `lib/tournament/transitions.ts` |
| Página `/admin/events/[id]` | Removidos `QueueSection`, `TransitionToFinalButton`, fetch de `getQueue` e `canTransitionToFinalTable`. Adicionado `EndEventButton` no rodapé |
| `MatchControls` simplificado | Sem caso FINALIZADA (Renovate/Release), sem `StartFinalMatchButton`. Caso FINALIZADA agora mostra apenas "Mesa finalizada (histórico)" |

## O que foi ADICIONADO

| Coisa | Onde |
|---|---|
| `detectChampionAndEndEvent(eventId)` | `lib/tournament/champion-detection.ts` — idempotente; chamada após `eliminatePlayer`. Se sobrou 1 player em JOGANDO no evento todo, vira CAMPEAO + event vai pra ENCERRADO |
| `endEventManually(eventId)` | `lib/tournament/events.ts` — fallback se admin precisa encerrar manualmente; se 1 player JOGANDO, ele vira CAMPEAO; caso contrário, encerra sem campeão |
| `EndEventButton` | `app/admin/events/[id]/end-event-button.tsx` — botão pequeno no rodapé com AlertDialog de confirmação |
| Tipo `CHAMPION_DETECTED` no action_log | `lib/tournament/action-log.ts` (ActionPayload union) + migration 0002 (CHECK constraint) + `lib/types/domain.ts` (ACTION_TYPES) |
| Tipo `EVENT_MANUALLY_ENDED` no action_log | mesmos lugares |
| Undo de `CHAMPION_DETECTED` | `undoLastAction` em `matches.ts` |
| Undo de `EVENT_MANUALLY_ENDED` | idem |
| Testes pra timer negativo | `lib/timer/calculate.test.ts` (2 novos casos) + `lib/timer/format.test.ts` (7 casos) |

## Migration aplicada

`supabase/migrations/0002_v1_1_simplification.sql`:

1. `COMMENT ON COLUMN` em `events.state`, `players.state`, `blind_levels.is_final_table`, `matches.is_final_table` documentando que estão deprecadas
2. `ALTER TABLE action_log` adicionando `CHAMPION_DETECTED` e `EVENT_MANUALLY_ENDED` ao CHECK constraint (preservando os 6 tipos antigos)

Aplicada via `supabase db push` no projeto `hccsbjuefsqvjsnukyup` em 2026-05-21.

**Dados antigos foram PRESERVADOS.** Nenhum DELETE/UPDATE em rows existentes.

## Compatibilidade com dados antigos

Eventos criados antes da V1.1 (com `state=MESA_FINAL`, players em `CLASSIFICADO/NA_FINAL/VICE/TERCEIRO/OUTROS_FINALISTAS`, matches com `is_final_table=true`) continuam renderizando:

- TV: layout MESA_FINAL ainda renderiza (comentário explicativo em `event-tv.tsx`)
- Pódio: tenta primeiro por `final_position`, fallback pra `state` legado
- Undo de FINISH_MATCH antigo: ainda funciona (preserva `previousState.eventState` opcional pra mesa final)
- `finishMatch`: continua exportada (sem chamadores na UI nova)

## Critérios de aceitação atendidos

- ✅ `npm run build` passa
- ✅ `npx tsc --noEmit` passa (zero erros)
- ✅ `npm test` passa (16 testes — 5 novos pra timer negativo)
- ✅ `npm run lint` passa (zero warnings)
- ✅ Zero `any` em `app/ components/ lib/ utils/`
- ✅ Migration 0002 aplicada
- ✅ Cron de blinds removido (rotas: `/api/cron/` não existe)
- ✅ Botão "Iniciar Mesa Final" não existe na UI nova
- ✅ Botão "Renovar mesa" não existe na UI nova
- ✅ Botão "Encerrar evento manualmente" existe quando `state=EM_ANDAMENTO`
- ⚠️ Validação E2E browser: **pendente** (rodar `npm run dev` e seguir smoke test mínimo)

## Smoke test mínimo (próximo passo)

```bash
npm run dev
```

Abrir `http://localhost:3000/admin/login`:

1. Criar evento + credenciar 4 jogadores
2. Iniciar partida com 4 → cronômetro desconta
3. Pausar 30s + retomar → continua de onde parou
4. Avançar nível manualmente → blinds sobem
5. Aguardar passar do tempo → fica negativo em vermelho
6. Eliminar 3 jogadores → quando sobra 1, automaticamente:
   - Vira CAMPEAO
   - Evento → ENCERRADO
   - TV mostra Podium
7. Abrir `/admin/events/[id]/results` → vê ranking
8. Voltar pro detalhe → "Desfazer última ação" → tudo volta (incluindo evento → EM_ANDAMENTO)

## Limitações conhecidas

- **`isLevelExpired` em `lib/timer/calculate.ts`** ainda existe (era usado pelo cron). Continua funcional, só não tem chamador automático. Pode ser usado manualmente se quiser.
- **`final-table.ts`** mantém código histórico — `canTransitionToFinalTable` ainda faz queries (pra UIs que esperam o tipo de retorno). Pode ser limpo numa próxima passada.
- **`physical_tables` state=FINALIZADA** ainda existe no enum. Mesa que esvazia fica em JOGANDO com 0 participações ativas (decisão V1.1). FINALIZADA só aparece em dados pré-V1.1.

## Próximo: V1.2

Quando V1.1 for validada e mergeada, V1.2 introduz:
- Player entra na mesa pelo próprio celular (`/player/[token]` com Server Action)
- Player troca de mesa pelo próprio celular
- Player se auto-elimina pelo celular
- Botão "Mostrar fichas no telão" — player digita número, aparece na TV por 10-15s
- Histórico no banco (tempo em cada mesa, vezes que mostrou fichas)
