import { describe, expect, it } from "vitest";
import { activeHref } from "@/lib/admin-nav";

const HREFS = [
  "/admin/events",
  "/admin/profiles",
  "/admin/inscritos",
  "/admin/galeria",
  "/admin/feedback",
  "/admin/events/lixeira",
];

describe("activeHref", () => {
  it("casa rota exata", () => {
    expect(activeHref("/admin/events", HREFS)).toBe("/admin/events");
  });
  it("casa subrota do evento com Eventos", () => {
    expect(activeHref("/admin/events/abc123", HREFS)).toBe("/admin/events");
  });
  it("a rota mais específica (Lixeira) ganha de Eventos", () => {
    expect(activeHref("/admin/events/lixeira", HREFS)).toBe(
      "/admin/events/lixeira"
    );
  });
  it("casa subrota de perfis", () => {
    expect(activeHref("/admin/profiles/new", HREFS)).toBe("/admin/profiles");
  });
  it("retorna null fora do admin", () => {
    expect(activeHref("/me", HREFS)).toBeNull();
  });
});
