-- =========================================================================
-- V1.3: blind_levels per-mesa
-- =========================================================================
-- Antes:  blind_levels.event_id  → uma estrutura única compartilhada entre mesas.
-- Depois: blind_levels.physical_table_id → cada mesa tem sua própria estrutura,
--         editável pelo admin. Cronômetro também já é per-match (level_started_at).
--
-- event_id continua na row (denormalizado) pra simplificar policies e queries
-- de TV/admin que ainda olham "todos os blinds do evento".

-- 1. Adiciona coluna (nullable temporariamente pra dar tempo do backfill).
alter table public.blind_levels
  add column physical_table_id uuid references public.physical_tables(id) on delete cascade;

-- 2. Derruba a unique antiga (event_id, level_number, is_final_table) ANTES de duplicar,
--    senão o INSERT abaixo viola o constraint.
alter table public.blind_levels
  drop constraint if exists blind_levels_event_id_level_number_is_final_table_key;

-- 3a. Aponta os blinds existentes pra primeira mesa de cada evento.
with first_tables as (
  select distinct on (event_id) event_id, id as table_id
  from public.physical_tables
  order by event_id, table_number
)
update public.blind_levels bl
set physical_table_id = ft.table_id
from first_tables ft
where bl.event_id = ft.event_id
  and bl.physical_table_id is null;

-- 3b. Duplica esses blinds pras outras mesas do mesmo evento.
insert into public.blind_levels
  (event_id, physical_table_id, level_number, small_blind, big_blind, ante, duration_minutes, is_final_table)
select
  pt.event_id,
  pt.id,
  bl.level_number,
  bl.small_blind,
  bl.big_blind,
  bl.ante,
  bl.duration_minutes,
  bl.is_final_table
from public.physical_tables pt
join public.blind_levels bl on bl.event_id = pt.event_id
where pt.id <> bl.physical_table_id;

-- 3c. Reaponta matches.current_level_id pra blind da mesa correta.
-- (Matches que já estavam na primeira mesa do evento mantêm; outros migram.)
update public.matches m
set current_level_id = bl_new.id
from public.blind_levels bl_old, public.blind_levels bl_new
where m.current_level_id is not null
  and bl_old.id = m.current_level_id
  and bl_new.physical_table_id = m.physical_table_id
  and bl_new.level_number = bl_old.level_number
  and bl_new.is_final_table = bl_old.is_final_table
  and bl_old.id <> bl_new.id;

-- 4. Torna NOT NULL.
alter table public.blind_levels
  alter column physical_table_id set not null;

-- 5. Cria a unique nova (mesa, nível, mesa final).
alter table public.blind_levels
  add constraint blind_levels_table_level_unique
    unique (physical_table_id, level_number, is_final_table);

-- 6. Reindex.
drop index if exists idx_blind_levels_event;
create index idx_blind_levels_table
  on public.blind_levels(physical_table_id, is_final_table, level_number);
