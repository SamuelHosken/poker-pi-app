-- =========================================================================
-- V1.3: chip_displays — pedidos de "mostrar fichas" do player pra TV
-- =========================================================================
-- Player pressiona "Mostrar" na página /me/mesa/[id]/dinheiro → insert aqui.
-- TV subscreve a inserts e renderiza overlay com nome + amount por 15s.
-- Sem update/delete: registros são write-once e podem servir de histórico.

create table public.chip_displays (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  amount      bigint not null check (amount >= 0),
  created_at  timestamptz not null default now()
);

create index idx_chip_displays_event_recent
  on public.chip_displays(event_id, created_at desc);

alter table public.chip_displays enable row level security;

create policy chip_displays_select_public
  on public.chip_displays
  for select using (true);

-- Player só insere chip_display vinculado ao próprio player row
create policy chip_displays_insert_self
  on public.chip_displays
  for insert with check (
    exists (
      select 1 from public.players p
      where p.id = chip_displays.player_id
        and p.profile_id = auth.uid()
    )
  );

-- Admin pode tudo (debug, limpeza)
create policy chip_displays_admin_all
  on public.chip_displays
  for all using (
    exists (select 1 from public.events e where e.id = chip_displays.event_id and e.admin_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = chip_displays.event_id and e.admin_user_id = auth.uid())
  );

-- Habilita realtime na tabela
alter publication supabase_realtime add table public.chip_displays;
