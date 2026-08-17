import { describe, it, expect, vi } from "vitest";
import { processWebhookEvent, idDaCobrancaAbacate, type WebhookDeps } from "./webhook";

const ticketFixture = {
  id: "t1", status: "pending", buyer_email: "a@b.com",
  ticket_name: "Padrão", when_text: "11/07", location_text: "Solar",
};

function deps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    findTicketByPaymentId: vi.fn().mockResolvedValue({ ...ticketFixture }),
    findTicketByCheckoutId: vi.fn().mockResolvedValue({ ...ticketFixture }),
    findTicketById: vi.fn().mockResolvedValue({ ...ticketFixture }),
    findTicketByAbacateChargeId: vi.fn().mockResolvedValue({ ...ticketFixture }),
    markPaid: vi.fn().mockResolvedValue("qr_abc"),
    markRefunded: vi.fn().mockResolvedValue(undefined),
    verifyPaymentPaid: vi.fn().mockResolvedValue(true),
    verifyAbacatePaid: vi.fn().mockResolvedValue(true),
    notifyAdmins: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    recordEvent: vi.fn().mockResolvedValue(undefined),
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

  it("CHECKOUT_PAID: acha o ticket pelo checkout id, marca pago e envia e-mail", async () => {
    const d = deps();
    const r = await processWebhookEvent(
      { event: "CHECKOUT_PAID", checkout: { id: "chk_1" } }, d,
    );
    expect(r.handled).toBe(true);
    expect(d.findTicketByCheckoutId).toHaveBeenCalledWith("chk_1");
    expect(d.markPaid).toHaveBeenCalledWith("t1", "CREDIT_CARD");
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "a@b.com", ticketUrl: "https://mesapigroup.com/ingresso/qr_abc",
    }));
  });

  it("CHECKOUT_PAID sem checkout conhecido não faz nada", async () => {
    const d = deps({ findTicketByCheckoutId: vi.fn().mockResolvedValue(null) });
    const r = await processWebhookEvent({ event: "CHECKOUT_PAID", checkout: { id: "x" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("anti-forjar: se o Asaas NÃO confirma o pagamento, não marca pago", async () => {
    const d = deps({ verifyPaymentPaid: vi.fn().mockResolvedValue(false) });
    const r = await processWebhookEvent({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("estorno: PAYMENT_REFUNDED libera a vaga (markRefunded)", async () => {
    const d = deps();
    const r = await processWebhookEvent({ event: "PAYMENT_REFUNDED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(true);
    expect(d.markRefunded).toHaveBeenCalledWith("t1");
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("I3: markPaid devolve null (corrida perdida) e o e-mail NAO e reenviado", async () => {
    const d = deps({ markPaid: vi.fn().mockResolvedValue(null) });
    const r = await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(false);
    expect(r.reason).toBe("já confirmado (corrida)");
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("I3: duas entregas do mesmo pagamento produzem UM e-mail", async () => {
    const markPaid = vi.fn()
      .mockResolvedValueOnce("qr_abc")
      .mockResolvedValueOnce(null);
    const d = deps({ markPaid });
    const payload = { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } };

    const first = await processWebhookEvent(payload, d);
    const second = await processWebhookEvent({ ...payload, event: "PAYMENT_RECEIVED" }, d);

    expect(first.handled).toBe(true);
    expect(second.handled).toBe(false);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("I3: estorno seguido de retry do estorno nao quebra", async () => {
    const d = deps();
    const payload = { event: "PAYMENT_REFUNDED", payment: { id: "pay_1" } };
    await processWebhookEvent(payload, d);
    const again = await processWebhookEvent(payload, d);
    expect(again.handled).toBe(true);
    expect(d.markRefunded).toHaveBeenCalledTimes(2);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("registra o payload cru ANTES de decidir qualquer coisa", async () => {
    const d = deps();
    const payload = { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", billingType: "PIX" } };
    await processWebhookEvent(payload, d);
    expect(d.recordEvent).toHaveBeenCalledWith({
      provider: "asaas", event: "PAYMENT_CONFIRMED", paymentId: "pay_1", raw: payload,
    });
  });

  it("registra ate eventos que serao ignorados (e onde o bug se esconde)", async () => {
    const d = deps();
    await processWebhookEvent({ event: "PAYMENT_CREATED", payment: { id: "x" } }, d);
    expect(d.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "PAYMENT_CREATED", paymentId: "x" }),
    );
  });

  it("falha ao registrar NAO derruba o processamento do pagamento", async () => {
    const d = deps({ recordEvent: vi.fn().mockRejectedValue(new Error("tabela sumiu")) });
    const r = await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(true);
  });
});

/* ------------------------------------------------- AbacatePay (Pix transparente) */

/** Envelope da AbacatePay, no formato que a doc publica descreve. */
function envelopeAbacate(evento: string, chargeId = "pix_char_abc123") {
  return {
    id: "log_xyz",
    event: evento,
    apiVersion: 2,
    devMode: false,
    data: { id: chargeId, amount: 18500, status: "PAID" },
  };
}

describe("idDaCobrancaAbacate", () => {
  it("acha o id em data.id", () => {
    expect(idDaCobrancaAbacate(envelopeAbacate("transparent.completed"))).toBe("pix_char_abc123");
  });

  it("acha o id em caminhos alternativos, porque a doc não fixa o formato", () => {
    expect(idDaCobrancaAbacate({ data: { pixQrCode: { id: "pix_char_a" } } })).toBe("pix_char_a");
    expect(idDaCobrancaAbacate({ data: { transparent: { id: "pix_char_b" } } })).toBe("pix_char_b");
    expect(idDaCobrancaAbacate({ data: { charge: { id: "pix_char_c" } } })).toBe("pix_char_c");
  });

  it("recusa id que não tem cara de cobrança, em vez de aceitar qualquer string", () => {
    // Sem isto, um `data.id` que fosse o id do LOG (log_...) viraria busca de
    // ticket por um id que nunca vai casar, e o pagamento sumiria em silêncio.
    expect(idDaCobrancaAbacate({ data: { id: "log_xyz" } })).toBeNull();
    expect(idDaCobrancaAbacate({ data: { id: 123 } })).toBeNull();
    expect(idDaCobrancaAbacate({ data: {} })).toBeNull();
    expect(idDaCobrancaAbacate(null)).toBeNull();
    expect(idDaCobrancaAbacate("nem objeto é")).toBeNull();
  });
});

describe("processWebhookEvent · AbacatePay", () => {
  it("transparent.completed confirma o ingresso e manda o e-mail", async () => {
    const d = deps();
    const r = await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    expect(r.handled).toBe(true);
    expect(d.findTicketByAbacateChargeId).toHaveBeenCalledWith("pix_char_abc123");
    expect(d.markPaid).toHaveBeenCalledWith("t1", "PIX");
    expect(d.sendEmail).toHaveBeenCalled();
  });

  it("NÃO confirma se o gateway não disser que está pago", async () => {
    const d = deps({ verifyAbacatePaid: vi.fn().mockResolvedValue(false) });
    const r = await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("re-verifica ANTES de procurar o ticket", async () => {
    // A ordem importa: verificar depois de achar o ticket deixaria um POST
    // forjado revelar se aquela cobrança existe no nosso banco.
    const d = deps();
    await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    const ordemVerifica = (d.verifyAbacatePaid as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const ordemBusca = (d.findTicketByAbacateChargeId as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(ordemVerifica).toBeDefined();
    expect(ordemBusca).toBeDefined();
    expect(ordemVerifica!).toBeLessThan(ordemBusca!);
  });

  it("é idempotente: a segunda entrega não reenvia e-mail", async () => {
    const d = deps({ markPaid: vi.fn().mockResolvedValueOnce("qr_abc").mockResolvedValueOnce(null) });
    const primeira = await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    const segunda = await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    expect(primeira.handled).toBe(true);
    expect(segunda.handled).toBe(false);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("transparent.refunded libera a vaga", async () => {
    const d = deps();
    const r = await processWebhookEvent(envelopeAbacate("transparent.refunded"), d);
    expect(r.handled).toBe(true);
    expect(d.markRefunded).toHaveBeenCalledWith("t1");
  });

  it("disputed e lost NÃO liberam a vaga (o dinheiro ainda não voltou)", async () => {
    for (const evento of ["transparent.disputed", "transparent.lost"]) {
      const d = deps();
      const r = await processWebhookEvent(envelopeAbacate(evento), d);
      expect(r.handled).toBe(false);
      expect(d.markRefunded).not.toHaveBeenCalled();
    }
  });

  it("sem id de cobrança não trata, mas REGISTRA o payload cru", async () => {
    const d = deps();
    const r = await processWebhookEvent({ event: "transparent.completed", data: {} }, d);
    expect(r.handled).toBe(false);
    expect(r.reason).toMatch(/sem id/i);
    expect(d.recordEvent).toHaveBeenCalled();
  });

  it("evento da AbacatePay não é confundido com o do Asaas", async () => {
    const d = deps();
    await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    expect(d.findTicketByPaymentId).not.toHaveBeenCalled();
    expect(d.verifyPaymentPaid).not.toHaveBeenCalled();
  });
});

describe("recordEvent · de qual gateway veio", () => {
  it("marca abacate no evento da AbacatePay, com o id da cobrança", async () => {
    const d = deps();
    await processWebhookEvent(envelopeAbacate("transparent.completed"), d);
    expect(d.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "abacate", paymentId: "pix_char_abc123" }),
    );
  });

  it("continua marcando asaas no evento do Asaas", async () => {
    const d = deps();
    await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(d.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "asaas", paymentId: "pay_1" }),
    );
  });
});

describe("aviso ao admin quando o ingresso é pago", () => {
  it("avisa em toda confirmação, seja do Asaas ou da AbacatePay", async () => {
    for (const payload of [
      { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } },
      envelopeAbacate("transparent.completed"),
    ]) {
      const d = deps();
      await processWebhookEvent(payload, d);
      expect(d.notifyAdmins).toHaveBeenCalledWith("t1");
    }
  });

  it("NÃO avisa quando perdeu a corrida (a outra entrega já avisou)", async () => {
    const d = deps({ markPaid: vi.fn().mockResolvedValue(null) });
    await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(d.notifyAdmins).not.toHaveBeenCalled();
  });

  it("NÃO avisa em estorno", async () => {
    const d = deps();
    await processWebhookEvent({ event: "PAYMENT_REFUNDED", payment: { id: "pay_1" } }, d);
    expect(d.notifyAdmins).not.toHaveBeenCalled();
  });

  it("aviso que falha NÃO derruba a emissão do ingresso", async () => {
    // A regra que importa: push quebrado é um admin sem aviso; exceção aqui
    // seria um comprador sem ingresso.
    const d = deps({ notifyAdmins: vi.fn().mockRejectedValue(new Error("v2 fora do ar")) });
    const r = await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(true);
    expect(d.sendEmail).toHaveBeenCalled();
  });

  it("avisa DEPOIS do QR existir, não antes", async () => {
    const d = deps();
    await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    const ordemMarcar = (d.markPaid as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const ordemAvisar = (d.notifyAdmins as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(ordemMarcar!).toBeLessThan(ordemAvisar!);
  });
});
