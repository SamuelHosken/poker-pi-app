-- =========================================================================
-- V1.2 fix — Quebra recursão infinita nas policies de profiles.
-- =========================================================================
-- Problema:
--   A policy `profiles_admin_modify` usava FOR ALL (cobre SELECT) com cláusula
--   USING contendo `EXISTS (SELECT FROM profiles ...)`. Quando alguém fazia
--   SELECT em profiles, a USING dela disparava outra SELECT em profiles, que
--   por sua vez disparava de novo → loop. Postgres detecta e aborta com
--   "infinite recursion detected in policy for relation profiles".
--
-- Solução:
--   1. Cria função `public.is_admin(uid)` com SECURITY DEFINER — ela roda
--      como owner (bypassa RLS) e devolve o flag sem disparar policies.
--   2. Dropa a policy FOR ALL antiga.
--   3. Cria policies separadas pra INSERT/UPDATE/DELETE usando is_admin().
--      SELECT continua governada pela policy profiles_select_authenticated
--      (já existente) que NÃO faz subquery — só checa auth.uid() is not null.
-- =========================================================================

begin;

-- ----------------------------------------------------------------------
-- 1. Função is_admin (SECURITY DEFINER bypassa RLS)
-- ----------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = uid limit 1),
    false
  );
$$;

-- Permite todos os roles chamarem
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------
-- 2. Drop policy FOR ALL recursiva
-- ----------------------------------------------------------------------
drop policy if exists profiles_admin_modify on public.profiles;

-- ----------------------------------------------------------------------
-- 3. Policies CUD separadas usando is_admin()
-- ----------------------------------------------------------------------
create policy profiles_admin_insert on public.profiles
  for insert
  with check (public.is_admin(auth.uid()));

create policy profiles_admin_update_others on public.profiles
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy profiles_admin_delete on public.profiles
  for delete
  using (public.is_admin(auth.uid()));

-- profiles_select_authenticated continua intacto (SELECT pra qualquer logado).
-- profiles_self_update continua intacto (player atualiza o próprio name/nickname).

commit;
