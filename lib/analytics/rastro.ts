import {
  NOMES_DE_AREA,
  NOMES_DE_FUNIL,
  NOMES_DE_TOQUE,
  type SiteEventName,
  type TrackInput,
} from "./types";

/*
  O que o NAVEGADOR tem direito de gravar.

  A lista existe porque a rota que usa isto e publica e sem login: qualquer um no
  mundo pode postar nela. Se ela aceitasse qualquer nome de `SITE_EVENT_NAMES`,
  um laco de `curl` gravaria `paid` a vontade e o painel passaria a somar receita
  que nunca entrou.

  Os tres que ficam de fora sao verdade do SERVIDOR, escritos de dentro do
  `createTicketOrder` e do webhook, onde a cobranca ja existe:

    order_created  order_failed  paid

  Quem chega aqui so pode contar o que o proprio navegador dele fez.

  ELA E DERIVADA DOS GRUPOS, e nao mais copiada a mao, desde que a LP passou a
  medir doze areas. A lista escrita duas vezes era uma lista de sete; com
  dezenove nomes, copiar seria fabricar a divergencia que o teste existia para
  achar. Derivar troca o teste por uma garantia: `NOMES_DO_SERVIDOR` nao entra
  aqui por construcao, e nome novo de dinheiro nao tem como vazar por
  esquecimento. O que o teste guarda agora e que os tres grupos particionam
  `SITE_EVENT_NAMES` sem sobra e sem buraco.
*/
export const NOMES_DO_NAVEGADOR = [
  ...NOMES_DE_FUNIL,
  ...NOMES_DE_AREA,
  ...NOMES_DE_TOQUE,
] as const;

export type NomeDoNavegador = (typeof NOMES_DO_NAVEGADOR)[number];

const PERMITIDOS = new Set<string>(NOMES_DO_NAVEGADOR);

export function nomePermitido(v: unknown): v is NomeDoNavegador {
  return typeof v === "string" && PERMITIDOS.has(v);
}

/* Os tres valores que o painel sabe desenhar. Qualquer outro vira nulo em vez
   de entrar cru: `device` alimenta uma lista de rotulos na tela. */
const APARELHOS = new Set(["mobile", "tablet", "desktop"]);

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/**
 * Peneira o corpo que veio do navegador e devolve o que o `trackEvent` aceita.
 * `null` quando o nome nao e do navegador: a rota trata isso como recusa
 * silenciosa.
 *
 * DUAS COISAS NAO ATRAVESSAM, de proposito:
 *
 * - **`eventId`**, porque quem decide de qual edicao e o evento e o servidor,
 *   lendo `sales_open`. Aceitar do corpo deixaria qualquer um pendurar visita
 *   falsa na edicao que quisesse.
 * - **`meta`**, que e `jsonb` sem forma. Numa rota publica isso e um deposito de
 *   texto livre de graca, e nada na tela le `meta` de evento de navegador.
 */
export function sanearRastro(body: unknown): Omit<TrackInput, "eventId"> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!nomePermitido(b.name)) return null;

  const aparelho = texto(b.device);

  return {
    name: b.name as SiteEventName,
    sessionId: texto(b.sessionId),
    path: texto(b.path),
    ref: texto(b.ref),
    utmSource: texto(b.utmSource),
    utmMedium: texto(b.utmMedium),
    utmCampaign: texto(b.utmCampaign),
    plan: texto(b.plan),
    device: aparelho && APARELHOS.has(aparelho) ? aparelho : null,
    referrer: texto(b.referrer),
    meta: null,
  };
}
