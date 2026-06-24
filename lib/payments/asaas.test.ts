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
  it("POSTa em /payments com value em reais e billingType UNDEFINED", async () => {
    const f = mockJson({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const res = await createAsaasPayment(
      { customerId: "cus_123", valueCents: 15000, description: "Ingresso", externalReference: "t1", dueDate: "2026-07-11" },
      f,
    );
    expect(res).toEqual({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const body = JSON.parse(f.mock.calls[0]![1]!.body as string);
    expect(body.value).toBe(150);          // cents -> reais
    expect(body.billingType).toBe("UNDEFINED");
    expect(body.externalReference).toBe("t1");
  });

  it("lança quando o Asaas responde erro", async () => {
    const f = mockJson({ errors: [{ description: "boom" }] }, false);
    await expect(
      createAsaasPayment({ customerId: "c", valueCents: 100, description: "x", externalReference: "t", dueDate: "2026-07-11" }, f),
    ).rejects.toThrow(/boom/);
  });
});
