-- =========================================================================
-- Analytics de primeira mão: funil da LP /pokerpi + atribuição da compra
-- =========================================================================
-- site_events é um log append-only de eventos do site (page_view, plan_select,
-- checkout_start, order_created, paid, etc). Sem PII: só session_id anônimo +
-- contexto. Permite montar o funil e cruzar "abriu -> clicou -> comprou".
-- Escrita e leitura SÓ via service role (server-side). RLS liga e nega o resto.
-- =========================================================================

create table if not exists public.site_events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  session_id  text,
  path        text,
  ref         text,            -- atribuição: slug do convite ou campanha
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  plan        text,            -- nome do tipo de ingresso, quando o evento é de plano
  event_id    uuid references public.events(id) on delete set null,
  device      text,            -- mobile | tablet | desktop
  referrer    text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_site_events_name    on public.site_events (name);
create index if not exists idx_site_events_created  on public.site_events (created_at desc);
create index if not exists idx_site_events_session  on public.site_events (session_id);
create index if not exists idx_site_events_event    on public.site_events (event_id);
create index if not exists idx_site_events_ref      on public.site_events (ref);

alter table public.site_events enable row level security;
-- Sem policies: só service role acessa (igual tickets/convite_opens).

-- ---- Atribuição da compra no ticket --------------------------------------
-- Carimba na compra de qual sessão/origem veio, pra ligar o funil até o "pago".
alter table public.tickets
  add column if not exists analytics_session_id text,
  add column if not exists source               text;
