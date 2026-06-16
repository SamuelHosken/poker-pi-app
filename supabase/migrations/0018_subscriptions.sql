-- =========================================================================
-- Inscrições da landing pública (subscriptions)
-- =========================================================================
-- Formulário público da nova edição: a pessoa preenche nome, e-mail, telefone
-- (com DDI internacional) e responde se foi na 1ª edição do PokerPi.
--
-- Sem auth: qualquer visitante (role anon) insere. A leitura é só do admin via
-- service role (que ignora RLS) — não há policy de SELECT pública pra manter a
-- lista de inscritos privada. Mesma estratégia da tabela `event_feedback`.
-- =========================================================================

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  full_name               text not null,
  email                   text not null,
  -- Telefone em formato E.164 (ex.: +5561999998888) montado no cliente.
  phone                   text not null,
  -- Código ISO-3166 alpha-2 do país do telefone (ex.: 'BR', 'PT'), pra relatório.
  phone_country           text,
  attended_first_edition  boolean not null,
  created_at              timestamptz not null default now()
);

-- Dedup por e-mail (case-insensitive): cada e-mail se inscreve uma vez.
create unique index uq_subscriptions_email on public.subscriptions (lower(email));
create index idx_subscriptions_created on public.subscriptions (created_at desc);

alter table public.subscriptions enable row level security;

-- Qualquer um (mesmo anônimo) pode se inscrever. Validações de formato/tamanho
-- ficam aqui como rede de segurança — a verificação real (sintaxe + MX +
-- descartáveis) acontece na Server Action antes do insert.
create policy subscriptions_insert_public on public.subscriptions
  for insert to anon, authenticated
  with check (
    char_length(full_name) between 1 and 120
    and char_length(email) between 3 and 254
    and email like '%@%'
    and char_length(phone) between 5 and 24
  );

-- Sem policy de SELECT: a lista de inscritos só é lida pelo painel admin via
-- service role (bypassa RLS).
