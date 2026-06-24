export type WebhookDeps = {
  findTicketByPaymentId(paymentId: string): Promise<{
    id: string;
    status: string;
    buyer_email?: string;
    buyer_name?: string;
    ticket_name?: string;
    when_text?: string;
    location_text?: string;
  } | null>;
  markPaid(ticketId: string, method: string | null): Promise<string>; // retorna qrToken
  sendEmail(args: {
    to: string; buyerName: string; ticketName: string;
    whenText: string; locationText: string; ticketUrl: string;
  }): Promise<void>;
  siteUrl: string;
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

export async function processWebhookEvent(
  payload: unknown,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  const p = payload as { event?: string; payment?: { id?: string; billingType?: string; customer?: string } };
  if (!p?.event || !PAID_EVENTS.has(p.event)) return { handled: false, reason: "evento ignorado" };
  const paymentId = p.payment?.id;
  if (!paymentId) return { handled: false, reason: "sem payment id" };

  const ticket = await deps.findTicketByPaymentId(paymentId);
  if (!ticket) return { handled: false, reason: "ticket não encontrado" };
  if (ticket.status === "paid") return { handled: false, reason: "já pago (idempotente)" };

  const qrToken = await deps.markPaid(ticket.id, p.payment?.billingType ?? null);

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
