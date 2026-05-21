-- =========================================================================
-- V1.1 — Simplificação do modelo
-- =========================================================================
-- Esta migration PRESERVA todos os dados existentes. Apenas:
--   1. Anota colunas como deprecadas (cosmético — COMMENT)
--   2. Relaxa CHECK constraint do action_log.action_type pra aceitar
--      dois novos tipos (CHAMPION_DETECTED, EVENT_MANUALLY_ENDED).
--
-- Eventos anteriores à V1.1 (que usavam MESA_FINAL, CLASSIFICADO,
-- VICE/TERCEIRO, etc.) continuam visíveis no histórico. A V1.1 só impede
-- CRIAR novos com esses estados.
-- =========================================================================

begin;

-- 2.1: Marcar event states deprecados (informational only)
comment on column public.events.state is
  'V1.1: MESA_FINAL deprecado. Novos eventos vão direto EM_ANDAMENTO → ENCERRADO.';

-- 2.2: Marcar player states deprecados
comment on column public.players.state is
  'V1.1: CHAMADO, CLASSIFICADO, NA_FINAL, VICE, TERCEIRO, OUTROS_FINALISTAS deprecados. Mantidos no enum por compat com histórico.';

-- 2.3: blind_levels.is_final_table deprecada
comment on column public.blind_levels.is_final_table is
  'V1.1: deprecada. Mantida para histórico. Novos eventos só usam is_final_table=false.';

-- 2.4: matches.is_final_table deprecada
comment on column public.matches.is_final_table is
  'V1.1: deprecada. Mantida para histórico.';

-- 2.5: action_log: preservar tipos antigos + adicionar novos
-- Drop constraint atual (gerado inline em 0001, nome convencional do Postgres)
alter table public.action_log
  drop constraint if exists action_log_action_type_check;

alter table public.action_log
  add constraint action_log_action_type_check
  check (action_type in (
    'ELIMINATE_PLAYER',
    'FINISH_MATCH',
    'ASSIGN_SEAT',
    'START_MATCH',
    'REBUY_PLAYER',
    'TRANSITION_TO_FINAL',
    'CHAMPION_DETECTED',
    'EVENT_MANUALLY_ENDED'
  ));

comment on column public.action_log.action_type is
  'V1.1: adicionados CHAMPION_DETECTED e EVENT_MANUALLY_ENDED. TRANSITION_TO_FINAL e FINISH_MATCH preservados por compat com undo histórico.';

commit;
