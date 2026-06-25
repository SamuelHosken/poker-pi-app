import { describe, expect, it } from "vitest";
import { avatarInitial } from "@/lib/avatar";

describe("avatarInitial", () => {
  it("retorna a primeira letra maiúscula", () => {
    expect(avatarInitial("rafael")).toBe("R");
  });
  it("ignora espaços à esquerda", () => {
    expect(avatarInitial("  ana")).toBe("A");
  });
  it("retorna '?' para nome vazio", () => {
    expect(avatarInitial("")).toBe("?");
    expect(avatarInitial("   ")).toBe("?");
  });
});
