import { describe, it, expect } from "vitest";
import { corsHeaders } from "./cors";

describe("corsHeaders", () => {
  it("libera o site institucional, com e sem www", () => {
    for (const o of ["https://mesapigroup.com", "https://www.mesapigroup.com"]) {
      expect(corsHeaders(o)["Access-Control-Allow-Origin"]).toBe(o);
    }
  });

  it("ecoa a origem em vez de devolver a lista", () => {
    // O header aceita UM valor. Devolver dois faz o navegador recusar tudo.
    const h = corsHeaders("https://mesapigroup.com");
    expect(h["Access-Control-Allow-Origin"]).not.toContain(",");
  });

  it("não libera origem desconhecida", () => {
    for (const o of [
      "https://mesapigroup.com.br",
      "https://evil.com",
      "https://mesapigroup.com.evil.com",
      "http://mesapigroup.com",
      "https://sub.mesapigroup.com",
    ]) {
      expect(corsHeaders(o)).toEqual({});
    }
  });

  it("nunca responde curinga", () => {
    // Com `*` qualquer site do mundo criaria cobrança em nome da casa e
    // queimaria o limite por CPF de comprador real.
    for (const o of ["https://mesapigroup.com", "https://evil.com", null]) {
      expect(corsHeaders(o)["Access-Control-Allow-Origin"]).not.toBe("*");
    }
  });

  it("sem origem não devolve cabeçalho nenhum", () => {
    expect(corsHeaders(null)).toEqual({});
  });

  it("marca Vary: Origin quando libera", () => {
    // Sem isto um cache intermediário serve a resposta de uma origem para outra.
    expect(corsHeaders("https://mesapigroup.com").Vary).toBe("Origin");
  });
});
