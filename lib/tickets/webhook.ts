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
  markPaid(ticketId: string, method: string | null): Promise<string>; // retorna qrToken
  sendEmail(args: {
    to: string; buyerName: string; ticketName: string;
    whenText: string; locationText: string; ticketUrl: string;
  }): Promise<void>;
  siteUrl: string;
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

/** Marca o ticket pago e manda o e-mail com o QR. Idempotente (ticket já pago sai cedo). */
async function confirmTicket(
  ticket: Ticket | null,
  method: string | null,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  if (!ticket) return { handled: false, reason: "ticket não encontrado" };
  if (ticket.status === "paid") return { handled: false, reason: "já pago (idempotente)" };

  const qrToken = await deps.markPaid(ticket.id, method);

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
  if (!p?.event) return { handled: false, reason: "evento ignorado" };

  // Fluxo novo: Checkout do Asaas (parcelamento). Casa pelo checkout id.
  if (p.event === "CHECKOUT_PAID") {
    const checkoutId = p.checkout?.id;
    if (!checkoutId) return { handled: false, reason: "sem checkout id" };
    const ticket = await deps.findTicketByCheckoutId(checkoutId);
    return confirmTicket(ticket, p.payment?.billingType ?? "CREDIT_CARD", deps);
  }

  // Fluxo antigo (/payments) e reconciliação: casa pelo payment id.
  if (PAID_EVENTS.has(p.event)) {
    const paymentId = p.payment?.id;
    if (!paymentId) return { handled: false, reason: "sem payment id" };
    const ticket = await deps.findTicketByPaymentId(paymentId);
    return confirmTicket(ticket, p.payment?.billingType ?? null, deps);
  }

  return { handled: false, reason: "evento ignorado" };
}
