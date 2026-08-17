import { describe, expect, it } from "vitest";
import { activeHref } from "@/lib/admin-nav";
import { ALL_HREFS, PAINEL_NO_APP } from "@/components/admin/nav-config";

/**
 * A navegação real, lida da própria config: fixture copiada à mão envelhece em
 * silêncio, e foi assim que `/admin/dashboard` continuou nesta lista depois de
 * sair da barra.
 */
const HREFS = ALL_HREFS;

describe("activeHref", () => {
  it("casa rota exata", () => {
    expect(activeHref("/admin/events", HREFS)).toBe("/admin/events");
  });

  it("casa subrota do evento com Eventos", () => {
    expect(activeHref("/admin/events/abc123", HREFS)).toBe("/admin/events");
  });

  it("os ingressos de um evento acendem Eventos", () => {
    expect(activeHref("/admin/events/abc123/ingressos", HREFS)).toBe("/admin/events");
  });

  it("retorna null fora do admin", () => {
    expect(activeHref("/entrar", HREFS)).toBeNull();
  });

  /*
    O "Painel no app" e endereco absoluto de outro dominio. Ele fica na mesma
    lista da barra, entao esta e a prova de que ele nunca acende: pathname
    comeca por "/" e nunca casa com "https://".
  */
  it("o atalho externo do painel nunca acende", () => {
    expect(HREFS).toContain(PAINEL_NO_APP);
    for (const p of ["/admin", "/admin/events", "/admin/inscritos", "/admin/dashboard"]) {
      expect(activeHref(p, HREFS)).not.toBe(PAINEL_NO_APP);
    }
  });

  /*
    A rota velha continua de pe, redirecionando para o app. Ela saiu da barra,
    entao nao deve acender nada quando alguem chega por um link salvo.
  */
  it("o endereco antigo do painel nao esta mais na barra", () => {
    expect(HREFS).not.toContain("/admin/dashboard");
    expect(activeHref("/admin/dashboard", HREFS)).toBeNull();
  });

  it("não casa prefixo parcial de palavra", () => {
    expect(activeHref("/admin/eventos-antigos", HREFS)).toBeNull();
  });

  it("a rota mais específica ganha quando as duas casam", () => {
    // Propriedade da função, testada com fixture própria: hoje a navegação não
    // tem nenhum par aninhado, mas ela volta a ter na primeira tela nova.
    const aninhadas = ["/admin/events", "/admin/events/lixeira"];
    expect(activeHref("/admin/events/lixeira", aninhadas)).toBe("/admin/events/lixeira");
  });
});
