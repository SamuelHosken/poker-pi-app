import { describe, expect, it } from "vitest";
import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("o tamanho default tem alvo de toque >= 44px (h-11)", () => {
    expect(buttonVariants({ size: "default" })).toContain("h-11");
  });
  it("o tamanho lg é h-12", () => {
    expect(buttonVariants({ size: "lg" })).toContain("h-12");
  });
  it("a variante default usa o primário (dourado)", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
  });
  it("a variante secondary é translúcida (surface)", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-surface");
  });
});
