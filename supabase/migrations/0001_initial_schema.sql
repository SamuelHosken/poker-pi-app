-- =========================================================================
-- Poker Pi — Migration 0001 · Schema inicial
-- =========================================================================
-- Cria todas as 7 tabelas do domínio: events, blind_levels, physical_tables,
-- players, matches, participations, action_log.
--
-- Convenções:
-- - Estados são `text` com CHECK constraints (não ENUMs do Postgres) para
--   facilitar evolução sem migrations destrutivas.
-- - Toda tabela tem RLS habilitada. SELECT é público (TV/jogador precisam ler
--   sem auth). INSERT/UPDATE/DELETE só pelo admin dono do evento.
-- - FK com ON DELETE CASCADE onde apagar o pai deve apagar os filhos.
-- - `updated_at` é atualizado via trigger.
-- =========================================================================

-- Helper: trigger function para atualizar updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Tabela: events
-- =========================================================================
create table public.events (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  event_date                  timestamptz not null,
  buy_in_cents                integer not null check (buy_in_cents >= 0),
  rebuy_cents                 integer check (rebuy_cents is null or rebuy_cents >= 0),
  rebuy_limit_per_player      integer not null default 1 check (rebuy_limit_per_player >= 0),
  rebuy_until_level           integer not null default 3 check (rebuy_until_level >= 0),
  table_size                  integer not null default 8 check (table_size between 2 and 12),
  number_of_physical_tables   integer not null default 2 check (number_of_physical_tables between 1 and 10),
  state                       text not null default 'SETUP'
                              check (state in ('SETUP','CREDENCIAMENTO','EM_ANDAMENTO','MESA_FINAL','ENCERRADO')),
  admin_user_id               uuid not null references auth.users(id) on delete restrict,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_events_state on public.events(state);
create index idx_events_admin_user on public.events(admin_user_id);

create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- =========================================================================
-- Tabela: blind_levels
-- =========================================================================
create table public.blind_levels (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  level_number        integer not null check (level_number >= 1),
  small_blind         integer not null check (small_blind >= 0),
  big_blind           integer not null check (big_blind >= 0),
  ante                integer not null default 0 check (ante >= 0),
  duration_minutes    integer not null check (duration_minutes > 0),
  is_final_table      boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (event_id, level_number, is_final_table)
);

create index idx_blind_levels_event
  on public.blind_levels(event_id, is_final_table, level_number);

-- =========================================================================
-- Tabela: physical_tables
-- =========================================================================
create table public.physical_tables (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  table_number  integer not null check (table_number >= 1),
  state         text not null default 'LIVRE'
                check (state in ('LIVRE','JOGANDO','PAUSADA','FINALIZADA')),
  created_at    timestamptz not null default now(),
  unique (event_id, table_number)
);

create index idx_physical_tables_event on public.physical_tables(event_id, table_number);

-- =========================================================================
-- Tabela: players
-- =========================================================================
create table public.players (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  name              text not null,
  nickname          text,
  phone             text,
  player_token      text not null unique,
  state             text not null default 'INSCRITO'
                    check (state in (
                      'INSCRITO','PRESENTE','CHAMADO','JOGANDO',
                      'ELIMINADO','CLASSIFICADO','NA_FINAL',
                      'CAMPEAO','VICE','TERCEIRO','OUTROS_FINALISTAS'
                    )),
  has_paid_buyin    boolean not null default false,
  rebuys_used       integer not null default 0 check (rebuys_used >= 0),
  final_position    integer check (final_position is null or final_position >= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_players_event_state on public.players(event_id, state);
create index idx_players_token on public.players(player_token);

create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

-- =========================================================================
-- Tabela: matches
-- =========================================================================
create table public.matches (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  physical_table_id   uuid not null references public.physical_tables(id) on delete cascade,
  match_number        integer not null check (match_number >= 1),
  is_final_table      boolean not null default false,
  state               text not null default 'LIVRE'
                      check (state in ('LIVRE','JOGANDO','PAUSADA','FINALIZADA')),
  current_level_id    uuid references public.blind_levels(id) on delete set null,
  level_started_at    timestamptz,
  paused_at           timestamptz,
  total_paused_ms     bigint not null default 0 check (total_paused_ms >= 0),
  winner_player_id    uuid references public.players(id) on delete set null,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (event_id, match_number)
);

create index idx_matches_event on public.matches(event_id, state);
create index idx_matches_physical_table on public.matches(physical_table_id);

create trigger trg_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

-- =========================================================================
-- Tabela: participations
-- =========================================================================
create table public.participations (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches(id) on delete cascade,
  player_id       uuid not null references public.players(id) on delete cascade,
  seat_number     integer check (seat_number is null or seat_number between 1 and 12),
  final_position  integer check (final_position is null or final_position >= 1),
  eliminated_at   timestamptz,
  rebought        boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (match_id, player_id)
);

create index idx_participations_match on public.participations(match_id);
create index idx_participations_player on public.participations(player_id);

-- =========================================================================
-- Tabela: action_log
-- =========================================================================
create table public.action_log (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  action_type   text not null
                check (action_type in (
                  'ELIMINATE_PLAYER',
                  'FINISH_MATCH',
                  'ASSIGN_SEAT',
                  'START_MATCH',
                  'REBUY_PLAYER',
                  'TRANSITION_TO_FINAL'
                )),
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  reverted_at   timestamptz
);

create index idx_action_log_event on public.action_log(event_id, created_at desc);
create index idx_action_log_pending on public.action_log(event_id) where reverted_at is null;

-- =========================================================================
-- Row Level Security
-- =========================================================================
-- Padrão: SELECT público (TV + jogador precisam ler sem login).
--         INSERT/UPDATE/DELETE só pelo admin dono do evento.
-- Exceção: action_log — só admin SELECT também (não há razão pra TV ver).
-- =========================================================================

alter table public.events            enable row level security;
alter table public.blind_levels      enable row level security;
alter table public.physical_tables   enable row level security;
alter table public.players           enable row level security;
alter table public.matches           enable row level security;
alter table public.participations    enable row level security;
alter table public.action_log        enable row level security;

-- ---- events ----
create policy events_select_public on public.events
  for select using (true);

create policy events_insert_own on public.events
  for insert with check (admin_user_id = auth.uid());

create policy events_update_own on public.events
  for update using (admin_user_id = auth.uid()) with check (admin_user_id = auth.uid());

create policy events_delete_own on public.events
  for delete using (admin_user_id = auth.uid());

-- ---- blind_levels ----
create policy blind_levels_select_public on public.blind_levels
  for select using (true);

create policy blind_levels_modify_admin on public.blind_levels
  for all using (
    exists (select 1 from public.events e where e.id = blind_levels.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = blind_levels.event_id and e.admin_user_id = auth.uid())
  );

-- ---- physical_tables ----
create policy physical_tables_select_public on public.physical_tables
  for select using (true);

create policy physical_tables_modify_admin on public.physical_tables
  for all using (
    exists (select 1 from public.events e where e.id = physical_tables.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = physical_tables.event_id and e.admin_user_id = auth.uid())
  );

-- ---- players ----
create policy players_select_public on public.players
  for select using (true);

create policy players_modify_admin on public.players
  for all using (
    exists (select 1 from public.events e where e.id = players.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = players.event_id and e.admin_user_id = auth.uid())
  );

-- ---- matches ----
create policy matches_select_public on public.matches
  for select using (true);

create policy matches_modify_admin on public.matches
  for all using (
    exists (select 1 from public.events e where e.id = matches.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = matches.event_id and e.admin_user_id = auth.uid())
  );

-- ---- participations ----
create policy participations_select_public on public.participations
  for select using (true);

create policy participations_modify_admin on public.participations
  for all using (
    exists (
      select 1
      from public.matches m
      join public.events e on e.id = m.event_id
      where m.id = participations.match_id and e.admin_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.matches m
      join public.events e on e.id = m.event_id
      where m.id = participations.match_id and e.admin_user_id = auth.uid()
    )
  );

-- ---- action_log (admin-only, inclusive SELECT) ----
create policy action_log_admin_select on public.action_log
  for select using (
    exists (select 1 from public.events e where e.id = action_log.event_id and e.admin_user_id = auth.uid())
  );

create policy action_log_admin_modify on public.action_log
  for all using (
    exists (select 1 from public.events e where e.id = action_log.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = action_log.event_id and e.admin_user_id = auth.uid())
  );

-- =========================================================================
-- Realtime publication
-- =========================================================================
-- Habilita as tabelas que serão consumidas via Supabase Realtime (TV + admin).
-- action_log NÃO entra (admin lê via fetch direto após mutação).
-- =========================================================================

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.blind_levels;
alter publication supabase_realtime add table public.physical_tables;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.participations;
