-- =========================================================================
-- Rastreio dos convites personalizados (/convite/[slug])
-- =========================================================================
-- Como cada link é privado de uma pessoa, "abriu o link" = aquela pessoa
-- abriu. Guardamos as aberturas pra o admin ver quem ABRIU mas NÃO se inscreveu
-- (pra cobrar). E marcamos de qual convite veio cada inscrição.
-- =========================================================================

-- De qual link de convite a inscrição veio (null = veio do /inscrever genérico
-- ou de antes deste rastreio existir).
alter table public.subscriptions
  add column if not exists convite_slug text;

-- Aberturas dos links de convite. Uma linha por abertura (de navegador real —
-- os robôs de preview não rodam JS, então não contam).
create table if not exists public.convite_opens (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  opened_at   timestamptz not null default now(),
  user_agent  text
);

create index if not exists idx_convite_opens_slug on public.convite_opens (slug);
create index if not exists idx_convite_opens_opened on public.convite_opens (opened_at desc);

-- RLS ligada sem policies: ninguém anônimo lê/escreve direto. As gravações vêm
-- da Server Action recordConviteOpen (service role, que bypassa RLS) e a leitura
-- é só do painel admin (service role). Mesma estratégia de subscriptions.
alter table public.convite_opens enable row level security;
