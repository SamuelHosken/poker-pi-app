import { describe, it, expect } from "vitest";
import { PIX_KEY, PIX_RECEIVER, PIX_WHATSAPP, pixWhatsappLink } from "./pix";

describe("pix config", () => {
  it("expoe a chave e o recebedor", () => {
    expect(PIX_KEY).toBe("pokerpi2026@gmail.com");
    expect(PIX_RECEIVER).toBe("Joao Henrique");
    expect(PIX_WHATSAPP).toBe("5561996631580");
  });
});

describe("pixWhatsappLink", () => {
  it("monta o link wa.me com a mensagem padrao encodada", () => {
    const link = pixWhatsappLink();
    expect(link.startsWith("https://wa.me/5561996631580?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("comprovante"));
  });
  it("aceita uma mensagem custom", () => {
    expect(pixWhatsappLink("oi mundo")).toBe(
      "https://wa.me/5561996631580?text=" + encodeURIComponent("oi mundo"),
    );
  });
});
