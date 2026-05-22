-- =========================================================================
-- V1.3: soft delete em events
-- =========================================================================
-- Em vez de DELETE cascade brutal, marcamos deleted_at. UI filtra padrão
-- "WHERE deleted_at IS NULL". Lixeira mostra os deletados, restaurar zera.
--
-- NOTA: o controle de pago já usa `players.has_paid_buyin` (boolean) que
-- existe desde a 0001. Esta migration só adiciona soft delete.

alter table public.events
  add column if not exists deleted_at timestamptz;

create index if not exists idx_events_deleted_at
  on public.events(deleted_at)
  where deleted_at is null;
