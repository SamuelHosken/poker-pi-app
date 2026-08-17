import { describe, it, expect } from "vitest";
import { resolveAbacateConfig, ABACATE_BASE_URL } from "./abacate-config";

describe("resolveAbacateConfig", () => {
  it("reconhece chave de produção e marca devMode false", () => {
    const cfg = resolveAbacateConfig({ ABACATE_API_KEY: "abc_prod_abc123" });
    expect(cfg.baseUrl).toBe(ABACATE_BASE_URL);
    expect(cfg.apiKey).toBe("abc_prod_abc123");
    expect(cfg.devMode).toBe(false);
  });

  it("reconhece chave de teste e marca devMode true", () => {
    const cfg = resolveAbacateConfig({ ABACATE_API_KEY: "abc_dev_abc123" });
    expect(cfg.devMode).toBe(true);
  });

  it("usa a MESMA URL base nos dois ambientes (o host não muda, a chave sim)", () => {
    const dev = resolveAbacateConfig({ ABACATE_API_KEY: "abc_dev_x" });
    const prod = resolveAbacateConfig({ ABACATE_API_KEY: "abc_prod_x" });
    expect(dev.baseUrl).toBe(prod.baseUrl);
  });

  it("lança se a chave faltar", () => {
    expect(() => resolveAbacateConfig({})).toThrow(/ausente/i);
  });

  it("lança se a chave for só espaço em branco", () => {
    expect(() => resolveAbacateConfig({ ABACATE_API_KEY: "   " })).toThrow(/ausente/i);
  });

  it("lança com prefixo desconhecido, em vez de adivinhar o ambiente", () => {
    expect(() => resolveAbacateConfig({ ABACATE_API_KEY: "sk_live_algumacoisa" })).toThrow(
      /prefixo desconhecido/i,
    );
  });
});
