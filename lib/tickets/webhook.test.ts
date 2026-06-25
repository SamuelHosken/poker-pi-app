import { describe, it, expect, vi } from "vitest";
import { processWebhookEvent, type WebhookDeps } from "./webhook";

function deps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    findTicketByPaymentId: vi.fn().mockResolvedValue({
      id: "t1", status: "pending", buyer_email: "a@b.com",
      ticket_name: "Padrão", when_text: "11/07", location_text: "Solar",
    }),
    markPaid: vi.fn().mockResolvedValue("qr_abc"),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    siteUrl: "https://mesapigroup.com",
    ...over,
  };
}

describe("processWebhookEvent", () => {
  it("confirma pagamento, marca pago e envia e-mail", async () => {
    const d = deps();
    const r = await processWebhookEvent(
      { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", billingType: "PIX" } }, d,
    );
    expect(r.handled).toBe(true);
    expect(d.markPaid).toHaveBeenCalledWith("t1", "PIX");
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "a@b.com", ticketUrl: "https://mesapigroup.com/ingresso/qr_abc",
    }));
  });

  it("ignora eventos não-pagamento", async () => {
    const d = deps();
    const r = await processWebhookEvent({ event: "PAYMENT_CREATED", payment: { id: "x" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("é idempotente: ticket já pago não reprocessa", async () => {
    const d = deps({ findTicketByPaymentId: vi.fn().mockResolvedValue({ id: "t1", status: "paid" }) });
    const r = await processWebhookEvent({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });
});
