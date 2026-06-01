-- =========================================================================
-- V1.3: avaliação desacoplada de evento
-- =========================================================================
-- A avaliação pós-evento deixa de exigir vínculo com um `events`. O link
-- /avaliar passa a ser independente — útil quando o evento já foi arquivado
-- (soft delete) ou ainda nem foi cadastrado. `event_id` vira opcional pra
-- permitir re-vincular no futuro sem nova migration.

alter table public.event_feedback
  alter column event_id drop not null;

-- Insert público (qualquer role, incluindo anon) sem precisar de evento. Sem
-- restrição de role pra não depender de como a publishable key é mapeada. As
-- notas continuam validadas pelos CHECKs (0..10) e não há policy de SELECT,
-- então nenhuma resposta vaza.
drop policy if exists event_feedback_insert_public on public.event_feedback;

create policy event_feedback_insert_public on public.event_feedback
  for insert
  with check (true);
