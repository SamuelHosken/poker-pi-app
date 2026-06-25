import { describe, expect, it } from "vitest";
import { playerStateLabel, tableStateLabel, eventStateLabel } from "@/lib/ui-labels";

describe("ui-labels", () => {
  it("traduz estados do jogador para PT-BR (nunca o enum cru)", () => {
    expect(playerStateLabel("JOGANDO")).toBe("Em jogo");
    expect(playerStateLabel("INSCRITO")).toBe("Inscrito");
    expect(playerStateLabel("ELIMINADO")).toBe("Eliminado");
    expect(playerStateLabel("CAMPEAO")).toBe("Campeão");
  });

  it("traduz estados da mesa", () => {
    expect(tableStateLabel("JOGANDO")).toBe("Em jogo");
    expect(tableStateLabel("PAUSADA")).toBe("Pausada");
    expect(tableStateLabel("LIVRE")).toBe("Livre");
    expect(tableStateLabel("FINALIZADA")).toBe("Finalizada");
  });

  it("traduz estados do evento", () => {
    expect(eventStateLabel("EM_ANDAMENTO")).toBe("Em andamento");
    expect(eventStateLabel("ENCERRADO")).toBe("Encerrado");
  });
});
