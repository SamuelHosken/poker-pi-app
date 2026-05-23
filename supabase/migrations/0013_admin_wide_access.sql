-- =========================================================================
-- V1.3 — RLS abre acesso a qualquer admin (profiles.is_admin = true)
-- =========================================================================
-- Antes: cada tabela checava `events.admin_user_id = auth.uid()` — só o
-- criador editava. Agora: qualquer profile com is_admin = true edita
-- qualquer evento. SELECT continua público (TV anônima).
--
-- Padrão alinhado com `profiles_admin_modify` que já existia (qualquer admin
-- modifica qualquer profile).

-- ---- events ----
drop policy if exists events_update_own on public.events;
drop policy if exists events_delete_own on public.events;
-- INSERT ainda exige admin_user_id = auth.uid() (admin cria evento em nome próprio)

create policy events_update_admin on public.events
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy events_delete_admin on public.events
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- blind_levels ----
drop policy if exists blind_levels_modify_admin on public.blind_levels;

create policy blind_levels_modify_admin on public.blind_levels
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- physical_tables ----
drop policy if exists physical_tables_modify_admin on public.physical_tables;

create policy physical_tables_modify_admin on public.physical_tables
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- players ----
drop policy if exists players_modify_admin on public.players;

create policy players_modify_admin on public.players
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- matches ----
drop policy if exists matches_modify_admin on public.matches;

create policy matches_modify_admin on public.matches
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- participations ----
drop policy if exists participations_modify_admin on public.participations;

create policy participations_modify_admin on public.participations
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ---- action_log ----
drop policy if exists action_log_admin on public.action_log;

create policy action_log_admin on public.action_log
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
