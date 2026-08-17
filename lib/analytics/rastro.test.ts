import { describe, expect, it } from "vitest";
import { NOMES_DO_NAVEGADOR, nomePermitido, sanearRastro } from "./rastro";
import { NOMES_DE_AREA, NOMES_DO_SERVIDOR, SITE_EVENT_NAMES } from "./types";

describe("nomePermitido", () => {
  it("aceita todo nome do navegador", () => {
    for (const n of NOMES_DO_NAVEGADOR) expect(nomePermitido(n)).toBe(true);
  });

  /*
    O teste que justifica o arquivo. Estes tres sao verdade do servidor: aceita-los
    de uma rota publica deixaria um laco de `curl` somar receita que nunca entrou.
  */
  it("recusa os tres que sao verdade do servidor", () => {
    for (const n of NOMES_DO_SERVIDOR) expect(nomePermitido(n)).toBe(false);
    expect([...NOMES_DO_SERVIDOR]).toEqual(["order_created", "order_failed", "paid"]);
  });

  /*
    Particao exata: sem sobra (nome que e das duas listas) e sem buraco (nome
    conhecido que nao e de nenhuma). E o que substitui a antiga conferencia entre
    duas listas escritas a mao, agora que a do navegador e derivada dos grupos.
  */
  it("os dois lados particionam a lista inteira, sem sobra e sem buraco", () => {
    const navegador = new Set<string>(NOMES_DO_NAVEGADOR);
    const servidor = new Set<string>(NOMES_DO_SERVIDOR);
    for (const n of SITE_EVENT_NAMES) {
      expect(navegador.has(n) !== servidor.has(n)).toBe(true);
    }
    expect(navegador.size + servidor.size).toBe(SITE_EVENT_NAMES.length);
  });

  /*
    As doze areas da LP existem para a tela do app desenhar onde a pessoa parou.
    Nome de area que o navegador nao pudesse gravar viraria 204 silencioso e a
    tela nasceria vazia parecendo certa.
  */
  it("aceita as doze areas da LP, e todas comecam por section_", () => {
    expect(NOMES_DE_AREA).toHaveLength(12);
    for (const n of NOMES_DE_AREA) {
      expect(n.startsWith("section_")).toBe(true);
      expect(nomePermitido(n)).toBe(true);
    }
  });

  it("recusa nome inventado e valor que nem e texto", () => {
    expect(nomePermitido("drop_table")).toBe(false);
    expect(nomePermitido(null)).toBe(false);
    expect(nomePermitido(42)).toBe(false);
    expect(nomePermitido(undefined)).toBe(false);
  });
});

describe("sanearRastro", () => {
  it("devolve nulo quando o corpo nao serve", () => {
    expect(sanearRastro(null)).toBeNull();
    expect(sanearRastro("page_view")).toBeNull();
    expect(sanearRastro({})).toBeNull();
    expect(sanearRastro({ name: "paid" })).toBeNull();
  });

  it("deixa passar o que a tela precisa", () => {
    const r = sanearRastro({
      name: "page_view",
      sessionId: "s_abc",
      path: "/3edicao",
      ref: "rafael",
      utmSource: "instagram",
      utmMedium: "story",
      utmCampaign: "3edicao",
      device: "mobile",
      referrer: "https://www.instagram.com/",
    });
    expect(r).toMatchObject({
      name: "page_view",
      sessionId: "s_abc",
      path: "/3edicao",
      ref: "rafael",
      utmSource: "instagram",
      device: "mobile",
    });
  });

  it("nao aceita eventId nem meta do navegador", () => {
    const r = sanearRastro({
      name: "page_view",
      eventId: "00000000-0000-0000-0000-000000000000",
      meta: { texto: "x".repeat(5000) },
    }) as Record<string, unknown>;
    // A edicao sai de `sales_open` no servidor, e `meta` e jsonb sem forma.
    expect(r.eventId).toBeUndefined();
    expect(r.meta).toBeNull();
  });

  it("normaliza aparelho desconhecido para nulo", () => {
    expect(sanearRastro({ name: "page_view", device: "geladeira" })?.device).toBeNull();
    expect(sanearRastro({ name: "page_view", device: "tablet" })?.device).toBe("tablet");
  });

  it("trata texto em branco e tipo errado como ausencia", () => {
    const r = sanearRastro({ name: "plan_select", sessionId: "   ", plan: 7, ref: null });
    expect(r?.sessionId).toBeNull();
    expect(r?.plan).toBeNull();
    expect(r?.ref).toBeNull();
  });

  it("apara o espaco em volta", () => {
    expect(sanearRastro({ name: "page_view", ref: "  rafael  " })?.ref).toBe("rafael");
  });
});
