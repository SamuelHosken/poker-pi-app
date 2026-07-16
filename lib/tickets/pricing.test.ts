import { describe, it, expect } from "vitest";
import { cardFeePercent, grossUpCents, installmentOptions, MAX_INSTALLMENTS } from "./pricing";

describe("cardFeePercent", () => {
  it("1x usa a taxa à vista (2,99%)", () => {
    expect(cardFeePercent(1)).toBeCloseTo(0.0299);
  });
  it("2 a 6x usam a taxa da faixa (3,49%)", () => {
    expect(cardFeePercent(2)).toBeCloseTo(0.0349);
    expect(cardFeePercent(6)).toBeCloseTo(0.0349);
  });
  it("rejeita parcela fora de 1..MAX", () => {
    expect(() => cardFeePercent(0)).toThrow();
    expect(() => cardFeePercent(MAX_INSTALLMENTS + 1)).toThrow();
  });
});

describe("grossUpCents", () => {
  it("acrescenta a taxa pra você receber o líquido (Open Bar R$185)", () => {
    // à vista: (18500+49)/(1-0,0299) = 19120,7 -> arredonda pra cima
    expect(grossUpCents(18500, 1)).toBe(19121);
    // 6x: (18500+49)/(1-0,0349) = 19219,7 -> 19220
    expect(grossUpCents(18500, 6)).toBe(19220);
  });

  it("nunca faz você receber menos que o valor base", () => {
    for (const base of [15000, 18500, 9999]) {
      for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
        const gross = grossUpCents(base, n);
        const liquido = gross * (1 - cardFeePercent(n)) - 49;
        expect(liquido).toBeGreaterThanOrEqual(base - 0.001);
      }
    }
  });
});

describe("installmentOptions", () => {
  it("gera 1..MAX com total e valor por parcela", () => {
    const opts = installmentOptions(18500);
    expect(opts).toHaveLength(MAX_INSTALLMENTS);
    expect(opts[0]).toMatchObject({ installments: 1, totalCents: 19121, perInstallmentCents: 19121 });
    const six = opts.find((o) => o.installments === 6)!;
    expect(six.totalCents).toBe(19220);
    expect(six.perInstallmentCents).toBe(3203); // "6x de R$ 32,03"
    const two = opts.find((o) => o.installments === 2)!;
    expect(two.perInstallmentCents).toBe(9610); // "2x de R$ 96,10"
  });
});
