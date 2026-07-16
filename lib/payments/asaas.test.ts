import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAsaasCustomer, createAsaasPayment } from "./asaas";

beforeEach(() => {
  process.env.ASAAS_ENV = "sandbox";
  process.env.ASAAS_API_KEY_SANDBOX = "test_key";
});

function mockJson(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe("createAsaasCustomer", () => {
  it("POSTa em /customers com header access_token e devolve o id", async () => {
    const f = mockJson({ id: "cus_123" });
    const res = await createAsaasCustomer(
      { name: "Ana", email: "a@b.com", phone: "+5561999998888", cpf: "52998224725" },
      f,
    );
    expect(res.id).toBe("cus_123");
    const call = f.mock.calls[0]!;
    const url = call[0];
    const init = call[1]!;
    expect(url).toBe("https://sandbox.asaas.com/api/v3/customers");
    expect((init.headers as Record<string, string>).access_token).toBe("test_key");
    expect(JSON.parse(init.body as string).cpfCnpj).toBe("52998224725");
  });
});

describe("createAsaasPayment", () => {
  it("PIX à vista: value em reais, billingType PIX, sem installmentCount", async () => {
    const f = mockJson({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const res = await createAsaasPayment(
      { customerId: "cus_123", valueCents: 18500, description: "Ingresso", externalReference: "t1", dueDate: "2026-07-11", billingType: "PIX" },
      f,
    );
    expect(res).toEqual({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const body = JSON.parse(f.mock.calls[0]![1]!.body as string);
    expect(body.value).toBe(185);
    expect(body.billingType).toBe("PIX");
    expect(body.installmentCount).toBeUndefined();
  });

  it("Cartão parcelado: installmentCount + totalValue, sem value", async () => {
    const f = mockJson({ id: "pay_10", invoiceUrl: "https://asaas/i/pay_10" });
    await createAsaasPayment(
      { customerId: "c", valueCents: 19220, description: "Ingresso", externalReference: "t2", dueDate: "2026-07-11", billingType: "CREDIT_CARD", installments: 6 },
      f,
    );
    const body = JSON.parse(f.mock.calls[0]![1]!.body as string);
    expect(body.installmentCount).toBe(6);
    expect(body.totalValue).toBe(192.2);
    expect(body.value).toBeUndefined();
    expect(body.billingType).toBe("CREDIT_CARD");
  });

  it("lança quando o Asaas responde erro", async () => {
    const f = mockJson({ errors: [{ description: "boom" }] }, false);
    await expect(
      createAsaasPayment({ customerId: "c", valueCents: 100, description: "x", externalReference: "t", dueDate: "2026-07-11", billingType: "PIX" }, f),
    ).rejects.toThrow(/boom/);
  });
});
