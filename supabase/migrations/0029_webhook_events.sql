-- Log append-only dos webhooks de gateway de pagamento.
--
-- Hoje, quando um pagamento da errado, nao existe forense: o payload do gateway
-- nao e guardado em lugar nenhum e a investigacao vira adivinhacao. Esta tabela
-- e escrita ANTES de qualquer decisao, inclusive pra eventos que serao
-- ignorados, que e justamente onde o bug costuma estar.
--
-- Nunca e lida pelo caminho quente. Escrita best-effort: falhar aqui nao pode
-- derrubar a confirmacao de um pagamento.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event text,
  payment_id text,
  raw jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_payment on public.webhook_events (payment_id);
create index if not exists idx_webhook_events_received on public.webhook_events (received_at desc);

-- Mesma postura das outras tabelas de pagamento: RLS ligada, sem policy.
-- Acesso so via service role, server-side.
alter table public.webhook_events enable row level security;
