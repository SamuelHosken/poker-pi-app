import { describe, it, expect } from "vitest";
import { resolveAsaasConfig } from "./asaas-config";

describe("resolveAsaasConfig", () => {
  it("usa sandbox URL + chave de sandbox quando ASAAS_ENV=sandbox", () => {
    const cfg = resolveAsaasConfig({
      ASAAS_ENV: "sandbox",
      ASAAS_API_KEY_SANDBOX: "sand_key",
      ASAAS_API_KEY_PRODUCTION: "prod_key",
    });
    expect(cfg.baseUrl).toBe("https://sandbox.asaas.com/api/v3");
    expect(cfg.apiKey).toBe("sand_key");
  });

  it("usa produção quando ASAAS_ENV=production", () => {
    const cfg = resolveAsaasConfig({
      ASAAS_ENV: "production",
      ASAAS_API_KEY_SANDBOX: "sand_key",
      ASAAS_API_KEY_PRODUCTION: "prod_key",
    });
    expect(cfg.baseUrl).toBe("https://api.asaas.com/v3");
    expect(cfg.apiKey).toBe("prod_key");
  });

  it("default é sandbox quando ASAAS_ENV ausente", () => {
    const cfg = resolveAsaasConfig({ ASAAS_API_KEY_SANDBOX: "s" });
    expect(cfg.baseUrl).toBe("https://sandbox.asaas.com/api/v3");
  });

  it("lança se a chave do ambiente escolhido faltar", () => {
    expect(() => resolveAsaasConfig({ ASAAS_ENV: "production" })).toThrow();
  });
});
