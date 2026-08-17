type Ticket = {
  id: string;
  status: string;
  buyer_email?: string;
  buyer_name?: string;
  ticket_name?: string;
  when_text?: string;
  location_text?: string;
};

export type WebhookDeps = {
  findTicketByPaymentId(paymentId: string): Promise<Ticket | null>;
  findTicketByCheckoutId(checkoutId: string): Promise<Ticket | null>;
  findTicketById(ticketId: string): Promise<Ticket | null>;
  /** Acha o ticket pelo id da cobranca Pix da AbacatePay (`pix_char_...`). */
  findTicketByAbacateChargeId(chargeId: string): Promise<Ticket | null>;
  markPaid(ticketId: string, method: string | null): Promise<string | null>; // qrToken, ou null se perdeu a corrida
  markRefunded(ticketId: string): Promise<void>; // estorno/chargeback: libera a vaga
  /** Re-verifica no Asaas se o pagamento esta REALMENTE pago (anti-forjar). */
  verifyPaymentPaid(paymentId: string): Promise<boolean>;
  /** O mesmo, na AbacatePay. Ver o comentario do ramo `transparent.*`. */
  verifyAbacatePaid(chargeId: string): Promise<boolean>;
  /*
    Avisa os admins que este ingresso foi pago. Best-effort e sem retorno: o
    aviso e nice-to-have e nao pode, em hipotese nenhuma, fazer a confirmacao
    do ingresso falhar.
  */
  notifyAdmins(ticketId: string): Promise<void>;
  sendEmail(args: {
    to: string; buyerName: string; ticketName: string;
    whenText: string; locationText: string; ticketUrl: string;
  }): Promise<void>;
  /** Log append-only do payload cru. Best-effort: falhar aqui nao derruba o pagamento. */
  recordEvent(args: {
    provider: string;
    event: string | null;
    paymentId: string | null;
    raw: unknown;
  }): Promise<void>;
  siteUrl: string;
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
// Estorno / chargeback / cobranca removida -> libera a vaga.
const REFUND_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_DELETED"]);

/*
  AbacatePay. Os nomes de evento nao colidem com os do Asaas (la e CAIXA_ALTA,
  aqui e ponto), entao os dois provedores cabem no mesmo roteador sem prefixo.

  So `completed` confirma. `disputed` e `lost` existem e NAO liberam a vaga de
  proposito: em Pix a disputa e rara, o dinheiro ainda nao voltou, e liberar
  cedo demais poe um segundo comprador numa cadeira que ainda tem dono. Eles
  ficam registrados em `webhook_events` e um humano decide.
*/
const ABACATE_PAID_EVENTS = new Set(["transparent.completed"]);
const ABACATE_REFUND_EVENTS = new Set(["transparent.refunded"]);

/** Prefixo do id de cobranca Pix da AbacatePay. Serve de validacao. */
const PREFIXO_COBRANCA = "pix_char_";

/**
 * Tira o id da cobranca do corpo do webhook da AbacatePay.
 *
 * A doc publica descreve o envelope (`{ id, event, apiVersion, devMode, data }`)
 * mas NAO documenta o formato exato do `data` de `transparent.*`. Em vez de
 * cravar um caminho e descobrir em producao que era outro, esta funcao procura
 * nos lugares plausiveis e **valida pelo prefixo**: so aceita o que parece um id
 * de cobranca de verdade.
 *
 * Devolver null aqui e seguro: o evento nao e tratado, o payload cru ja foi
 * gravado em `webhook_events`, e o `reconcilePendingTickets` pega o pagamento
 * pela consulta ao gateway. Confirmar o caminho real na primeira entrega e
 * simplificar esta funcao depois.
 */
export function idDaCobrancaAbacate(payload: unknown): string | null {
  const p = payload as {
    data?: {
      id?: unknown;
      pixQrCode?: { id?: unknown };
      transparent?: { id?: unknown };
      charge?: { id?: unknown };
    };
  } | null;
  const d = p?.data;
  const candidatos = [d?.id, d?.pixQrCode?.id, d?.transparent?.id, d?.charge?.id];
  for (const c of candidatos) {
    if (typeof c === "string" && c.startsWith(PREFIXO_COBRANCA)) return c;
  }
  return null;
}

/** Marca o ticket pago e manda o e-mail com o QR. Idempotente (ticket já pago sai cedo). */
export async function confirmTicket(
  ticket: Ticket | null,
  method: string | null,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  if (!ticket) return { handled: false, reason: "ticket não encontrado" };
  if (ticket.status === "paid") return { handled: false, reason: "já pago (idempotente)" };

  const qrToken = await deps.markPaid(ticket.id, method);
  // markPaid é o gate atômico: null = outra entrega concorrente já confirmou.
  // Sai sem reenviar e-mail (idempotência real, não só a checagem de status acima).
  if (qrToken === null) return { handled: false, reason: "já confirmado (corrida)" };

  /*
    O aviso ao admin sai DEPOIS do QR existir e ANTES do e-mail, e e `await`-ado.

    Depois do QR porque avisar antes seria avisar de algo que ainda pode falhar.
    Await porque em serverless uma promise solta e suspensa junto com o
    container e frequentemente nao completa, que foi exatamente como o aviso de
    PIX copiado se perdia de forma intermitente.

    O `catch` e a promessa que o tipo faz: nada aqui pode derrubar a emissao do
    ingresso. Push que falha e um admin sem aviso; excecao aqui e um comprador
    sem ingresso.
  */
  await deps.notifyAdmins(ticket.id).catch(() => undefined);

  if (ticket.buyer_email) {
    await deps.sendEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_name ?? ticket.buyer_email.split("@")[0] ?? ticket.buyer_email,
      ticketName: ticket.ticket_name ?? "Ingresso",
      whenText: ticket.when_text ?? "",
      locationText: ticket.location_text ?? "",
      ticketUrl: `${deps.siteUrl}/ingresso/${qrToken}`,
    });
  }
  return { handled: true };
}

export async function processWebhookEvent(
  payload: unknown,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  const p = payload as {
    event?: string;
    payment?: { id?: string; billingType?: string; customer?: string };
    checkout?: { id?: string };
  };

  /*
    Registra tudo que chega, inclusive o que sera ignorado. Best-effort de
    proposito: um problema no log nunca pode impedir a confirmacao de um pagamento.

    O provedor e DERIVADO do evento, e nao cravado. Estava cravado em "asaas", e
    com dois gateways isso arquivaria toda entrega da AbacatePay com o nome
    errado. Este log e a unica prova forense de pagamento que existe: se ele
    mente sobre a origem, ele deixa de servir para o que foi feito.
  */
  const provedor = p?.event?.startsWith("transparent.") ? "abacate" : "asaas";
  await deps.recordEvent({
    provider: provedor,
    event: p?.event ?? null,
    // O Asaas manda o id em `payment.id`; a AbacatePay, dentro de `data`.
    paymentId: p?.payment?.id ?? idDaCobrancaAbacate(payload),
    raw: payload,
  }).catch(() => undefined);

  if (!p?.event) return { handled: false, reason: "evento ignorado" };

  // Fluxo novo: Checkout do Asaas (parcelamento). Casa pelo checkout id.
  if (p.event === "CHECKOUT_PAID") {
    const checkoutId = p.checkout?.id;
    if (!checkoutId) return { handled: false, reason: "sem checkout id" };
    // Anti-forjar (mesma garantia do path /payments): se o evento traz o payment
    // id gerado pelo checkout, re-verifica no Asaas antes de confirmar. Se nao
    // traz payment id, confia no token do webhook (autenticado na rota).
    const checkoutPaymentId = p.payment?.id;
    if (checkoutPaymentId) {
      const reallyPaid = await deps.verifyPaymentPaid(checkoutPaymentId);
      if (!reallyPaid) return { handled: false, reason: "checkout nao confirmado no Asaas" };
    }
    const ticket = await deps.findTicketByCheckoutId(checkoutId);
    return confirmTicket(ticket, p.payment?.billingType ?? "CREDIT_CARD", deps);
  }

  // Fluxo /payments (PIX/cartao a vista) e reconciliação: casa pelo payment id.
  if (PAID_EVENTS.has(p.event)) {
    const paymentId = p.payment?.id;
    if (!paymentId) return { handled: false, reason: "sem payment id" };
    // Anti-forjar: so confirma se o Asaas diz que ESTA pago de verdade. Assim,
    // mesmo se o token do webhook vazar, ninguem marca pago sem ter pago.
    const reallyPaid = await deps.verifyPaymentPaid(paymentId);
    if (!reallyPaid) return { handled: false, reason: "nao confirmado no Asaas" };
    const ticket = await deps.findTicketByPaymentId(paymentId);
    return confirmTicket(ticket, p.payment?.billingType ?? null, deps);
  }

  /*
    AbacatePay, Pix do checkout transparente.

    A re-verificacao no gateway NAO e opcional aqui, e por um motivo mais forte
    do que no Asaas: a documentacao da AbacatePay se contradiz sobre qual e a
    chave do HMAC da assinatura (o `secret` que a gente escolhe, ou uma
    constante publicada na propria doc). Enquanto isso nao for confirmado com
    uma entrega real, a assinatura vale como filtro, nao como prova. Quem prova
    que o dinheiro entrou e a consulta ao gateway, que e a mesma regra que ja
    vale para o Asaas.
  */
  if (ABACATE_PAID_EVENTS.has(p.event)) {
    const chargeId = idDaCobrancaAbacate(payload);
    if (!chargeId) return { handled: false, reason: "sem id de cobranca" };
    const reallyPaid = await deps.verifyAbacatePaid(chargeId);
    if (!reallyPaid) return { handled: false, reason: "nao confirmado na AbacatePay" };
    const ticket = await deps.findTicketByAbacateChargeId(chargeId);
    return confirmTicket(ticket, "PIX", deps);
  }

  if (ABACATE_REFUND_EVENTS.has(p.event)) {
    const chargeId = idDaCobrancaAbacate(payload);
    if (!chargeId) return { handled: false, reason: "sem id de cobranca" };
    const ticket = await deps.findTicketByAbacateChargeId(chargeId);
    if (!ticket) return { handled: false, reason: "ticket não encontrado" };
    await deps.markRefunded(ticket.id);
    return { handled: true, reason: "estornado" };
  }

  // Estorno / chargeback / cobranca removida -> libera a vaga.
  if (REFUND_EVENTS.has(p.event)) {
    const paymentId = p.payment?.id;
    if (!paymentId) return { handled: false, reason: "sem payment id" };
    const ticket = await deps.findTicketByPaymentId(paymentId);
    if (!ticket) return { handled: false, reason: "ticket não encontrado" };
    await deps.markRefunded(ticket.id);
    return { handled: true, reason: "estornado" };
  }

  return { handled: false, reason: "evento ignorado" };
}
