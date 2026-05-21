import { describe, expect, it } from "vitest";
import { calculateTimeRemainingMs, isLevelExpired } from "./calculate";
import { formatTime } from "./format";

const baseMatch = {
  state: "JOGANDO" as const,
  level_started_at: null as string | null,
  paused_at: null as string | null,
  total_paused_ms: 0,
};

const oneMinuteLevel = { duration_minutes: 1 };

describe("calculateTimeRemainingMs", () => {
  it("retorna 0 quando level_started_at é null", () => {
    expect(calculateTimeRemainingMs(baseMatch, oneMinuteLevel)).toBe(0);
  });

  it("desconta o tempo decorrido em estado JOGANDO", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:00:30Z").getTime(); // 30s depois

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    const result = calculateTimeRemainingMs(match, oneMinuteLevel, now);

    expect(result).toBe(30_000); // 30s restantes
  });

  it("congela o tempo quando estado é PAUSADA", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const pausedAt = new Date("2026-05-23T20:00:20Z"); // pausou aos 20s
    const now = new Date("2026-05-23T20:05:00Z").getTime(); // muito depois

    const match = {
      ...baseMatch,
      state: "PAUSADA" as const,
      level_started_at: startedAt.toISOString(),
      paused_at: pausedAt.toISOString(),
    };

    const result = calculateTimeRemainingMs(match, oneMinuteLevel, now);
    expect(result).toBe(40_000); // ainda 40s, tempo congelado em PAUSADA
  });

  it("desconta total_paused_ms acumulado", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:00:40Z").getTime(); // 40s depois

    const match = {
      ...baseMatch,
      level_started_at: startedAt.toISOString(),
      total_paused_ms: 10_000, // 10s de pausa prévia
    };

    // Decorrido real do nível = 40s - 10s pausa = 30s → restam 30s
    expect(calculateTimeRemainingMs(match, oneMinuteLevel, now)).toBe(30_000);
  });

  it("nunca retorna valor negativo", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:05:00Z").getTime(); // muito depois

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    const result = calculateTimeRemainingMs(match, oneMinuteLevel, now);

    expect(result).toBe(0);
  });
});

describe("isLevelExpired", () => {
  it("retorna true quando tempo restante é 0", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:01:00Z").getTime(); // exatamente 1 min

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    expect(isLevelExpired(match, oneMinuteLevel, now)).toBe(true);
  });

  it("retorna false quando ainda há tempo", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:00:30Z").getTime();

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    expect(isLevelExpired(match, oneMinuteLevel, now)).toBe(false);
  });
});

describe("formatTime", () => {
  it("formata 0 como 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formata 65 segundos como 01:05", () => {
    expect(formatTime(65_000)).toBe("01:05");
  });

  it("formata negativos como 00:00 (clamp)", () => {
    expect(formatTime(-500)).toBe("00:00");
  });

  it("formata 60 minutos exatos como 60:00", () => {
    expect(formatTime(60 * 60_000)).toBe("60:00");
  });
});
