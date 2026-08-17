import { describe, it, expect } from "vitest";
import { resolvePixProvider, PIX_EXPIRA_SEGUNDOS } from "./pix-provider";

describe("resolvePixProvider", () => {
  it("liga a AbacatePay quando pedido explicitamente", () => {
    expect(resolvePixProvider({ PIX_PROVIDER: "abacate" })).toBe("abacate");
  });

  it("cai no manual quando a variável não existe", () => {
    // O caso que importa: ambiente novo que sobe sem a env não pode tentar
    // falar com um gateway para o qual ele talvez nem tenha chave.
    expect(resolvePixProvider({})).toBe("manual");
  });

  it("cai no manual com valor vazio, desconhecido ou errado", () => {
    for (const v of ["", "   ", "asaas", "stripe", "Abacatepay", "true", "1"]) {
      expect(resolvePixProvider({ PIX_PROVIDER: v })).toBe("manual");
    }
  });

  it("aceita caixa e espaço em volta, que é como env costuma chegar", () => {
    expect(resolvePixProvider({ PIX_PROVIDER: "ABACATE" })).toBe("abacate");
    expect(resolvePixProvider({ PIX_PROVIDER: " abacate " })).toBe("abacate");
  });
});

describe("PIX_EXPIRA_SEGUNDOS", () => {
  it("é meia hora, em segundos", () => {
    expect(PIX_EXPIRA_SEGUNDOS).toBe(1800);
  });
});
