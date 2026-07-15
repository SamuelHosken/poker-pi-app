import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCheckoutBody, createAsaasCheckout } from "./asaas";

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

const input = {
  ticketId: "tk_1",
  valueCents: 18500,
  itemName: "Ingresso Open Bar · Poker Pi",
  customer: { name: "Ana", email: "ana@x.com", phone: "5561999990000", cpf: "12345678900" },
  successUrl: "https://www.mesapigroup.com/ingresso/obrigado",
  maxInstallments: 12,
};

describe("buildCheckoutBody", () => {
  it("monta o corpo com cartão + pix, à vista + parcelado até 12x", () => {
    const body = buildCheckoutBody(input);
    expect(body.billingTypes).toEqual(["CREDIT_CARD", "PIX"]);
    expect(body.chargeTypes).toEqual(["DETACHED", "INSTALLMENT"]);
    expect(body.installment).toEqual({ maxInstallmentCount: 12 });
    expect(body.externalReference).toBe("tk_1");
    expect(body.callback.successUrl).toBe(input.successUrl);
  });

  it("põe o valor em reais no item (centavos / 100)", () => {
    const body = buildCheckoutBody(input);
    expect(body.items).toEqual([{ name: input.itemName, quantity: 1, value: 185 }]);
  });

  it("passa os dados do cliente com cpfCnpj", () => {
    const body = buildCheckoutBody(input);
    expect(body.customerData).toMatchObject({
      name: "Ana",
      cpfCnpj: "12345678900",
      email: "ana@x.com",
    });
  });
});

describe("createAsaasCheckout", () => {
  it("POSTa em /checkouts e devolve id + url do checkout", async () => {
    const f = mockJson({ id: "chk_abc" });
    const r = await createAsaasCheckout(input, f);
    expect(r.id).toBe("chk_abc");
    expect(r.url).toContain("chk_abc");
    // confere que bateu no endpoint certo com o token
    const [url, opts] = f.mock.calls[0]!;
    expect(String(url)).toContain("/checkouts");
    expect((opts as RequestInit).method).toBe("POST");
    expect(((opts as RequestInit).headers as Record<string, string>).access_token).toBe("test_key");
  });

  it("usa o link retornado quando o Asaas manda um", async () => {
    const f = mockJson({ id: "chk_abc", link: "https://asaas.com/c/xyz" });
    const r = await createAsaasCheckout(input, f);
    expect(r.url).toBe("https://asaas.com/c/xyz");
  });
});
