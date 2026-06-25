-- =========================================================================
-- Venda de ingressos online (ticket_types + tickets) + campos de LP no event
-- =========================================================================
-- A LP pública (/evento/[slug]) lê event + ticket_types. A compra cria um
-- ticket (status=pending) e uma cobrança no Asaas; o webhook confirma e gera
-- o qr_token. tickets contém PII + dados de pagamento => SEM SELECT público;
-- todo acesso é server-side via service role. ticket_types é público (read).
-- =========================================================================

-- ---- Campos de LP/venda no event -----------------------------------------
alter table public.events
  add column if not exists slug              text,
  add column if not exists starts_at         timestamptz,
  add column if not exists location_text     text,
  add column if not exists location_maps_url text,
  add column if not exists capacity          int,
  add column if not exists sales_open        boolean not null default true;

create unique index if not exists uq_events_slug on public.events (slug) where slug is not null;

-- ---- Tipos de ingresso ----------------------------------------------------
create table if not exists public.ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null,
  description text,
  price_cents int  not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_types_event on public.ticket_types (event_id);

alter table public.ticket_types enable row level security;
-- Leitura pública (a LP precisa mostrar os planos). Sem insert/update público.
create policy ticket_types_select_public on public.ticket_types
  for select to anon, authenticated using (true);

-- ---- Ingressos vendidos ----------------------------------------------------
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  ticket_type_id    uuid not null references public.ticket_types(id),
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text not null,
  buyer_cpf         text not null,
  amount_cents      int  not null,
  status            text not null default 'pending'
                      check (status in ('pending','paid','canceled')),
  asaas_customer_id text,
  asaas_payment_id  text,
  asaas_invoice_url text,
  payment_method    text,
  qr_token          text,
  paid_at           timestamptz,
  checked_in_at     timestamptz,
  checked_in_by     uuid,
  player_id         uuid references public.players(id) on delete set null,
  created_at        timestamptz not null default now()
);
create unique index if not exists uq_tickets_asaas_payment on public.tickets (asaas_payment_id) where asaas_payment_id is not null;
create unique index if not exists uq_tickets_qr_token on public.tickets (qr_token) where qr_token is not null;
create index if not exists idx_tickets_event on public.tickets (event_id);

alter table public.tickets enable row level security;
-- SEM policies: tickets só é acessado via service role (server-side). RLS
-- habilitada nega tudo por padrão para anon/authenticated.

-- ---- Seed do evento da 2ª edição ------------------------------------------
-- Observação: events.event_date e events.buy_in_cents são NOT NULL sem default
-- (schema original 0001). events.admin_user_id é NOT NULL referenciando
-- auth.users — usamos o primeiro usuário existente (o admin do sistema).
-- A coluna starts_at é adicionada acima; event_date espelha a mesma data.
insert into public.events (
  id,
  name,
  slug,
  starts_at,
  event_date,
  buy_in_cents,
  location_text,
  capacity,
  sales_open,
  state,
  admin_user_id
)
select
  gen_random_uuid(),
  'Poker Pi — 2ª Edição',
  'poker-pi-11-07',
  '2026-07-11T14:00:00-03:00'::timestamptz,
  '2026-07-11T14:00:00-03:00'::timestamptz,
  0,
  'Condomínio Solar da Serra, Quadra 1, Casa 14 — Jardim Botânico, Brasília · DF',
  35,
  true,
  'SETUP',
  (select id from auth.users order by created_at limit 1)
where not exists (
  select 1 from public.events where slug = 'poker-pi-11-07'
);

insert into public.ticket_types (event_id, name, description, price_cents, sort_order)
select e.id, v.name, v.description, v.price_cents, v.sort_order
from public.events e
cross join (values
  ('Padrão',   'Comida + bebidas não alcoólicas', 15000, 1),
  ('Open Bar', 'Tudo + Open Bar',                 18500, 2)
) as v(name, description, price_cents, sort_order)
where e.slug = 'poker-pi-11-07'
  and not exists (select 1 from public.ticket_types t where t.event_id = e.id);
