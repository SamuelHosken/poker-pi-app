-- =========================================================================
-- V1.2 — Profiles (cadastro de pessoas globais)
-- =========================================================================
-- - Cria tabela public.profiles vinculada 1:1 com auth.users (mesmo id)
-- - Trigger handle_new_user cria profile automaticamente quando user é
--   criado via Supabase Auth (com metadata opcional: name, nickname, is_admin)
-- - players ganha profile_id FK (nullable pra compat com convidados antigos)
-- - Backfill: cria profile pro admin existente (is_admin=true)
-- - RLS: profile pode ler todos profiles autenticados; só admin pode CUD
-- =========================================================================

begin;

-- ----------------------------------------------------------------------
-- 1. Tabela profiles
-- ----------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  nickname    text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index idx_profiles_is_admin on public.profiles(is_admin) where is_admin = true;

-- ----------------------------------------------------------------------
-- 2. Trigger handle_new_user (cria profile ao criar auth.users)
-- ----------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, nickname, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'nickname',
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------
-- 3. Backfill — cria profile pros auth.users já existentes
-- ----------------------------------------------------------------------
-- Todo user existente vira admin por default (eram todos admins até agora)
insert into public.profiles (id, name, is_admin)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  true
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------
-- 4. RLS em profiles
-- ----------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Qualquer logged-in pode ler todos os profiles (admin precisa ver lista;
-- player precisa ver o próprio nome). Sem PII sensível.
create policy profiles_select_authenticated on public.profiles
  for select using (auth.uid() is not null);

-- Player pode atualizar o próprio profile (name/nickname). is_admin SÓ admin.
-- Pra simplicidade do MVP: player full update no próprio (sem coluna lock).
-- is_admin é mexido só por admin via Server Action (que valida explicitamente).
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Só admin CUD (todos os outros profiles)
create policy profiles_admin_modify on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ----------------------------------------------------------------------
-- 5. players.profile_id — FK opcional pra ligar player a profile
-- ----------------------------------------------------------------------
alter table public.players
  add column profile_id uuid references public.profiles(id) on delete set null;

create index idx_players_profile on public.players(profile_id);

comment on column public.players.profile_id is
  'V1.2: FK pra public.profiles. Permite player se auto-identificar e entrar em mesa via /me. NULL = convidado avulso (legado, ou cadastrado sem profile).';

-- ----------------------------------------------------------------------
-- 6. RLS de players — adiciona self-update pra player entrar/sair de mesa
-- ----------------------------------------------------------------------
-- Não removemos a policy admin_modify existente — só ADICIONAMOS uma policy
-- que permite o player atualizar a si mesmo.
create policy players_self_update on public.players
  for update using (
    profile_id is not null and profile_id = auth.uid()
  ) with check (
    profile_id is not null and profile_id = auth.uid()
  );

-- ----------------------------------------------------------------------
-- 7. RLS de participations — player pode criar/atualizar a própria
-- ----------------------------------------------------------------------
create policy participations_self_insert on public.participations
  for insert with check (
    exists (
      select 1 from public.players p
      where p.id = participations.player_id
      and p.profile_id = auth.uid()
    )
  );

create policy participations_self_update on public.participations
  for update using (
    exists (
      select 1 from public.players p
      where p.id = participations.player_id
      and p.profile_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.players p
      where p.id = participations.player_id
      and p.profile_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------
-- 8. Realtime publication — adicionar profiles
-- ----------------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;

commit;
