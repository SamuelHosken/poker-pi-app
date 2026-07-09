// Eventos do funil do site. Append-only em public.site_events.
export const SITE_EVENT_NAMES = [
  "page_view", // abriu a LP
  "section_ingressos", // rolou até a seção de ingressos (interesse real)
  "ticket_cta_click", // clicou em "Garantir ingresso" (hero/nav/CTA final)
  "plan_select", // escolheu um plano (Padrão / Open Bar)
  "checkout_start", // começou a preencher o formulário
  "order_created", // gerou a cobrança no Asaas (server-side)
  "order_failed", // tentou comprar e deu erro (server-side)
  "paid", // pagamento confirmado pelo webhook (server-side)
  "whatsapp_click", // clicou pra entrar no grupo
  "map_click", // clicou em "Ver no mapa"
] as const;

export type SiteEventName = (typeof SITE_EVENT_NAMES)[number];

export type TrackInput = {
  name: SiteEventName;
  sessionId?: string | null;
  path?: string | null;
  ref?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  plan?: string | null;
  eventId?: string | null;
  device?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown> | null;
};
