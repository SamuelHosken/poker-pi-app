import { describe, expect, it } from "vitest";
import { formatTime } from "./format";

describe("formatTime", () => {
  it("formata 0 como 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formata 60_000 ms como 01:00", () => {
    expect(formatTime(60_000)).toBe("01:00");
  });

  it("formata 65_000 ms como 01:05", () => {
    expect(formatTime(65_000)).toBe("01:05");
  });

  it("formata 60 minutos exatos como 60:00", () => {
    expect(formatTime(60 * 60_000)).toBe("60:00");
  });

  it("V1.1: formata -30_000 ms como -00:30", () => {
    expect(formatTime(-30_000)).toBe("-00:30");
  });

  it("V1.1: formata -90_000 ms como -01:30", () => {
    expect(formatTime(-90_000)).toBe("-01:30");
  });

  it("V1.1: formata -1ms como -00:00 (truncado pra segundos)", () => {
    expect(formatTime(-1)).toBe("-00:00");
  });
});
