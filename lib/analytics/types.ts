/*
  Eventos do funil do site. Append-only em public.site_events.

  A lista está em três grupos, e o grupo importa: só o primeiro e o terceiro
  podem chegar do navegador. Quem decide isso é `NOMES_DO_NAVEGADOR`, em
  `rastro.ts`, e um teste cruza as duas listas para que ninguém acrescente aqui
  um nome de dinheiro e esqueça de recusá-lo lá.
*/

/** O funil: os degraus que separam quem passou os olhos de quem comprou. */
export const NOMES_DE_FUNIL = [
  "page_view", // abriu a LP
  "ticket_cta_click", // clicou em "Garantir ingresso"
  "plan_select", // escolheu um plano (Padrão / Open Bar)
  "checkout_start", // começou a preencher o formulário
] as const;

/*
  Onde a pessoa parou na página.

  Um nome por área da LP, na ordem em que elas aparecem em
  `home/app/3edicao/page.tsx`. São nomes fixos, e não um `section_view` com o
  rótulo vindo no corpo, porque esta lista é a mesma que autoriza a escrita numa
  rota pública: campo livre ali vira depósito de texto de graça.

  `section_ingressos` já existia e continua sendo o degrau do funil que separa
  interesse real. Ele agora é também o quinto membro desta família.
*/
export const NOMES_DE_AREA = [
  "section_abertura", // a capa
  "section_edicao", // que dia, onde, quanto
  "section_noite", // como a noite acontece
  "section_premiacao", // o troféu e os prêmios
  "section_ingressos", // os planos (interesse real)
  "section_planta", // a planta do lugar
  "section_para_quem", // para quem é
  "section_galeria", // as fotos
  "section_lugar", // o endereço e o mapa
  "section_especificacao", // a ficha técnica e as perguntas
  "section_contagem", // a contagem regressiva
  "section_fechamento", // o fechamento
] as const;

/** O que a pessoa TOCOU. Clique é intenção, e rolagem é só passagem. */
export const NOMES_DE_TOQUE = [
  "whatsapp_click", // clicou pra entrar no grupo
  "map_click", // clicou em "Ver no mapa"
  "faq_open", // abriu uma das perguntas
] as const;

/*
  Verdade do SERVIDOR: escritos de dentro do `createTicketOrder` e do webhook,
  onde a cobrança já existe. O navegador nunca pode gravar nenhum destes.
*/
export const NOMES_DO_SERVIDOR = [
  "order_created", // gerou a cobrança (server-side)
  "order_failed", // tentou comprar e deu erro (server-side)
  "paid", // pagamento confirmado pelo webhook (server-side)
] as const;

export const SITE_EVENT_NAMES = [
  ...NOMES_DE_FUNIL,
  ...NOMES_DE_AREA,
  ...NOMES_DE_TOQUE,
  ...NOMES_DO_SERVIDOR,
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
