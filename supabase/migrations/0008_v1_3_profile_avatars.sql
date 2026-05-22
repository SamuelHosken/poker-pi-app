-- =========================================================================
-- V1.3: profile avatars — foto de perfil dos usuários
-- =========================================================================
-- Coluna `avatar_url` em profiles (URL pública do Supabase Storage).
-- Bucket `avatars` público pra leitura; uploads são feitos via service_role
-- a partir de uma server action (validação acontece no servidor).

-- 1. Coluna no profile (texto, nullable — usuários sem foto vêem fallback)
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Bucket público pra avatares
-- file_size_limit em bytes (512KB acomoda fotos comprimidas no client)
-- allowed_mime_types: só imagens razoáveis
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3. RLS policies pro bucket
-- Leitura: pública (TV, perfil de outros etc)
drop policy if exists "Avatar images publicly readable" on storage.objects;
create policy "Avatar images publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload/update/delete: só via service_role (server actions). Não criamos
-- policy aberta pro authenticated — toda mutação passa pelo server.
-- (Service role bypassa RLS automaticamente.)
