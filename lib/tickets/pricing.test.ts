import { describe, it, expect } from "vitest";
import { cardFeePercent, grossUpCents, installmentOptions, MAX_INSTALLMENTS } from "./pricing";

describe("cardFeePercent", () => {
  it("1x usa a taxa à vista (2,99%)", () => {
    expect(cardFeePercent(1)).toBeCloseTo(0.0299);
  });
  it("2 e 3x usam a taxa da faixa (3,49%)", () => {
    expect(cardFeePercent(2)).toBeCloseTo(0.0349);
    expect(cardFeePercent(3)).toBeCloseTo(0.0349);
  });
  it("rejeita parcela fora de 1..MAX", () => {
    expect(() => cardFeePercent(0)).toThrow();
    expect(() => cardFeePercent(MAX_INSTALLMENTS + 1)).toThrow();
  });
});

describe("grossUpCents", () => {
  it("1x = só taxa do Asaas (sem financiamento) — Open Bar R$185", () => {
    // (18500+49)/(1-0,0299) = 19120,7 -> 19121
    expect(grossUpCents(18500, 1)).toBe(19121);
  });

  it("aplica o juro de financiamento que cresce com o prazo (2% a.m.)", () => {
    // 2x: financiado 18500*1,02=18870 -> (18870+49)/(1-0,0349)=19603,2 -> 19604
    expect(grossUpCents(18500, 2)).toBe(19604);
    // 3x: financiado 18500*1,02^2=19247 -> (19247+49)/(1-0,0349)=19993,8 -> 19994
    expect(grossUpCents(18500, 3)).toBe(19994);
  });

  it("é monotônico: mais parcelas => total maior", () => {
    const g1 = grossUpCents(18500, 1);
    const g2 = grossUpCents(18500, 2);
    const g3 = grossUpCents(18500, 3);
    expect(g2).toBeGreaterThan(g1);
    expect(g3).toBeGreaterThan(g2);
  });

  it("nunca faz você receber menos que o valor base", () => {
    for (const base of [15000, 18500, 9999]) {
      for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
        const liquido = grossUpCents(base, n) * (1 - cardFeePercent(n)) - 49;
        expect(liquido).toBeGreaterThanOrEqual(base - 0.001);
      }
    }
  });
});

describe("installmentOptions", () => {
  it("gera 1..MAX (=3) com total e valor por parcela", () => {
    const opts = installmentOptions(18500);
    expect(opts).toHaveLength(MAX_INSTALLMENTS);
    expect(opts[0]).toMatchObject({ installments: 1, totalCents: 19121, perInstallmentCents: 19121 });
    const two = opts.find((o) => o.installments === 2)!;
    expect(two).toMatchObject({ totalCents: 19604, perInstallmentCents: 9802 }); // 2x de R$ 98,02
    const three = opts.find((o) => o.installments === 3)!;
    expect(three).toMatchObject({ totalCents: 19994, perInstallmentCents: 6665 }); // 3x de R$ 66,65
  });
});
