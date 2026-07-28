-- =========================================================================
-- Inscricoes escopadas por edicao + identidade por CPF (3a Edicao, 12/09)
-- =========================================================================
-- A /inscrever do poker-pi-v2 passa a coletar CPF e a vincular a inscricao ao
-- profile de quem ja jogou. A tabela nasceu aqui (0018) e evolui aqui.
--
-- O indice unico de e-mail era GLOBAL: mantido assim, os 26 inscritos da 2a
-- edicao levariam "esse e-mail ja esta inscrito" ao tentar entrar na 3a. Passa
-- a ser unico DENTRO da edicao.
-- =========================================================================

alter table public.subscriptions
  add column if not exists cpf         text,
  add column if not exists profile_id  uuid references public.profiles(id) on delete set null,
  add column if not exists edition_key text not null default 'poker-pi-11-07';

-- As linhas que ja existiam sao todas da 2a edicao (o default acima carimbou).
-- A partir daqui o default aponta pra 3a: entre esta migration e o deploy, a
-- /inscrever no ar insere sem edition_key e essas linhas caem na 3a edicao,
-- que e onde quem se inscreve hoje quer estar. O default NAO e removido de
-- proposito: sem ele essa janela quebraria com violacao de not-null.
alter table public.subscriptions
  alter column edition_key set default 'poker-pi-12-09';

-- A pergunta "foi na 1a edicao?" saiu do formulario: o CPF responde. A coluna
-- fica como registro historico da 2a edicao, mas deixa de ser obrigatoria.
alter table public.subscriptions
  alter column attended_first_edition drop not null;

-- Unicidade por edicao (antes era global por e-mail).
drop index if exists uq_subscriptions_email;

create unique index if not exists uq_subscriptions_email_edicao
  on public.subscriptions (lower(email), edition_key);

create unique index if not exists uq_subscriptions_cpf_edicao
  on public.subscriptions (cpf, edition_key) where cpf is not null;

create index if not exists idx_subscriptions_edicao
  on public.subscriptions (edition_key, created_at desc);
