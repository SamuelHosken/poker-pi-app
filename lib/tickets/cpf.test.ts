import { describe, it, expect } from "vitest";
import { isValidCpf } from "./cpf";

describe("isValidCpf", () => {
  it("aceita CPF válido (com e sem máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
  it("rejeita todos iguais e tamanho errado", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});
