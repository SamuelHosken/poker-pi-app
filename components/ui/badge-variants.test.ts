import { describe, expect, it } from "vitest";
import { badgeVariants } from "@/components/ui/badge";

describe("badgeVariants", () => {
  it("a variante live usa o verde de status", () => {
    expect(badgeVariants({ variant: "live" })).toContain("text-live");
  });
  it("a variante gold usa o dourado-suave", () => {
    expect(badgeVariants({ variant: "gold" })).toContain("text-gold-soft");
  });
  it("a variante neutral é discreta", () => {
    expect(badgeVariants({ variant: "neutral" })).toContain("text-muted-foreground");
  });
});
