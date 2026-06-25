import { describe, it, expect } from "vitest";
import { hasCapacity } from "./capacity";

describe("hasCapacity", () => {
  it("permite quando há vagas", () => {
    expect(hasCapacity(34, 35)).toBe(true);
  });
  it("bloqueia quando lotou", () => {
    expect(hasCapacity(35, 35)).toBe(false);
  });
  it("sem limite (null) sempre permite", () => {
    expect(hasCapacity(999, null)).toBe(true);
  });
});
