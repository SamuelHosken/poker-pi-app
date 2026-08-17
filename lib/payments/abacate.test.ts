import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPixChargeBody,
  createAbacatePixCharge,
  getAbacatePixStatus,
  isAbacatePaidStatus,
} from "./abacate";

beforeEach(() => {
  process.env.ABACATE_API_KEY = "abc_dev_testkey";
});

/** Resposta no envelope da v2: { success, data, error }. */
function mockEnvelope(data: unknown, ok = true, status = ok ? 200 : 400) {
  const body = { success: ok, data: ok ? data : null, error: ok ? null : String(data) };
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

/** Cobrança de verdade, com a forma que a API de produção devolveu em 12/08. */
const CHARGE = {
  id: "pix_char_abc123",
  amount: 18500,
  status: "PENDING",
  devMode: false,
  brCode: "00020101021226810014br.gov.bcb.pix...",
  brCodeBase64: "data:image/png;base64,iVBORw0KGgo=",
  platformFee: 80,
  receiptUrl: null,
  expiresAt: "2026-08-12T18:22:50.486Z",
  metadata: { ticketId: "t-1" },
};

describe("buildPixChargeBody", () => {
  it("põe o discriminador `method` no TOPO, fora de `data`", () => {
    // A API recusa com "Value should be one of 'object', 'object'" se o method
    // vier dentro de data ou faltar. Este teste existe pra isso não voltar.
    const body = buildPixChargeBody({
      amountCents: 18500,
      description: "Ingresso Open Bar",
      expiresInSeconds: 3600,
    });
    expect(body.method).toBe("PIX");
    expect(body).not.toHaveProperty("data.method");
  });

  it("manda o valor em CENTAVOS inteiros, sem dividir por 100", () => {
    const body = buildPixChargeBody({
      amountCents: 18500,
      description: "x",
      expiresInSeconds: 60,
    });
    expect(body.data.amount).toBe(18500);
  });

  it("omite customer e metadata quando não vieram, em vez de mandar undefined", () => {
    const body = buildPixChargeBody({ amountCents: 100, description: "x", expiresInSeconds: 60 });
    expect(body.data).not.toHaveProperty("customer");
    expect(body.data).not.toHaveProperty("metadata");
  });

  it("carrega customer e metadata quando vieram", () => {
    const body = buildPixChargeBody({
      amountCents: 15000,
      description: "Ingresso Padrão",
      expiresInSeconds: 3600,
      customer: {
        name: "Ana Souza",
        email: "ana@exemplo.com",
        taxId: "529.982.247-25",
        cellphone: "(61) 99999-8888",
      },
      metadata: { ticketId: "t-42" },
    });
    expect(body.data.customer?.taxId).toBe("529.982.247-25");
    expect(body.data.metadata?.ticketId).toBe("t-42");
  });
});

describe("createAbacatePixCharge", () => {
  it("POSTa em /transparents/create com Bearer e devolve o QR", async () => {
    const f = mockEnvelope(CHARGE);
    const r = await createAbacatePixCharge(
      { amountCents: 18500, description: "Ingresso", expiresInSeconds: 3600 },
      f,
    );

    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api.abacatepay.com/v2/transparents/create");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer abc_dev_testkey");

    expect(r.id).toBe("pix_char_abc123");
    expect(r.brCode).toContain("br.gov.bcb.pix");
    expect(r.brCodeBase64).toMatch(/^data:image\/png;base64,/);
    expect(r.expiresAt).toBe("2026-08-12T18:22:50.486Z");
  });

  it("devolve valor e taxa em centavos, sem conversão", async () => {
    const f = mockEnvelope(CHARGE);
    const r = await createAbacatePixCharge(
      { amountCents: 18500, description: "Ingresso", expiresInSeconds: 3600 },
      f,
    );
    expect(r.amountCents).toBe(18500);
    expect(r.platformFeeCents).toBe(80);
  });

  it("expõe devMode, pra dar pra saber se o dinheiro é de verdade", async () => {
    const f = mockEnvelope({ ...CHARGE, devMode: true });
    const r = await createAbacatePixCharge(
      { amountCents: 100, description: "x", expiresInSeconds: 60 },
      f,
    );
    expect(r.devMode).toBe(true);
  });

  it("lança com a mensagem do gateway quando o HTTP não é 2xx", async () => {
    const f = mockEnvelope("CARD is not available for this store", false, 400);
    await expect(
      createAbacatePixCharge({ amountCents: 100, description: "x", expiresInSeconds: 60 }, f),
    ).rejects.toThrow(/CARD is not available for this store/);
  });

  it("lança em 200 com success:false, em vez de devolver cobrança vazia", async () => {
    // Hoje a API sempre erra com HTTP fora de 2xx. Se um dia responder 200 com
    // success:false, confiar no status devolveria data null como se fosse
    // cobrança boa, e o comprador veria um QR em branco.
    const body = { success: false, data: null, error: "loja bloqueada" };
    const f = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response);
    await expect(
      createAbacatePixCharge({ amountCents: 100, description: "x", expiresInSeconds: 60 }, f),
    ).rejects.toThrow(/loja bloqueada/);
  });

  it("lança quando o corpo não é JSON, sem estourar SyntaxError cru", async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "<html>502 Bad Gateway</html>",
    } as Response);
    await expect(
      createAbacatePixCharge({ amountCents: 100, description: "x", expiresInSeconds: 60 }, f),
    ).rejects.toThrow(/não-JSON/);
  });

  it("lança se a chave não estiver configurada, em vez de chamar sem auth", async () => {
    delete process.env.ABACATE_API_KEY;
    const f = mockEnvelope(CHARGE);
    await expect(
      createAbacatePixCharge({ amountCents: 100, description: "x", expiresInSeconds: 60 }, f),
    ).rejects.toThrow(/ABACATE_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("getAbacatePixStatus", () => {
  it("consulta /transparents/check com o id na query", async () => {
    const f = mockEnvelope({ id: "pix_char_abc123", status: "PAID", expiresAt: null });
    const r = await getAbacatePixStatus("pix_char_abc123", f);
    expect(f.mock.calls[0]![0]).toBe(
      "https://api.abacatepay.com/v2/transparents/check?id=pix_char_abc123",
    );
    expect(r.status).toBe("PAID");
  });

  it("escapa o id na URL, pra id estranho não virar query injetada", async () => {
    const f = mockEnvelope({ id: "a&b=c", status: "PENDING" });
    await getAbacatePixStatus("a&b=c", f);
    expect(f.mock.calls[0]![0]).toContain("id=a%26b%3Dc");
  });
});

describe("isAbacatePaidStatus", () => {
  it("só PAID conta como pago", () => {
    expect(isAbacatePaidStatus("PAID")).toBe(true);
  });

  it.each(["PENDING", "EXPIRED", "CANCELLED", "REFUNDED", "paid", "", "COMPLETED"])(
    "%s não conta como pago",
    (s) => {
      expect(isAbacatePaidStatus(s)).toBe(false);
    },
  );
});
