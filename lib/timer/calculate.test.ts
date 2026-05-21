import { describe, expect, it } from "vitest";
import { calculateTimeRemainingMs, isLevelExpired } from "./calculate";

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
    expect(calculateTimeRemainingMs(match, oneMinuteLevel, now)).toBe(30_000);
  });

  it("congela o tempo quando estado é PAUSADA", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const pausedAt = new Date("2026-05-23T20:00:20Z"); // pausou aos 20s
    const now = new Date("2026-05-23T20:05:00Z").getTime();

    const match = {
      ...baseMatch,
      state: "PAUSADA" as const,
      level_started_at: startedAt.toISOString(),
      paused_at: pausedAt.toISOString(),
    };

    expect(calculateTimeRemainingMs(match, oneMinuteLevel, now)).toBe(40_000);
  });

  it("desconta total_paused_ms acumulado", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:00:40Z").getTime();

    const match = {
      ...baseMatch,
      level_started_at: startedAt.toISOString(),
      total_paused_ms: 10_000,
    };

    expect(calculateTimeRemainingMs(match, oneMinuteLevel, now)).toBe(30_000);
  });

  it("V1.1: retorna valor NEGATIVO quando passou do tempo", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:05:00Z").getTime(); // 5 min depois, nível de 1 min

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    const result = calculateTimeRemainingMs(match, oneMinuteLevel, now);

    expect(result).toBeLessThan(0);
    // 1 minuto - 5 minutos = -4 minutos = -240_000 ms
    expect(result).toBe(-240_000);
  });

  it("V1.1: continua negativo mesmo após pausas acumuladas", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:03:00Z").getTime(); // 3 min depois

    const match = {
      ...baseMatch,
      level_started_at: startedAt.toISOString(),
      total_paused_ms: 30_000, // 30s pausado
    };

    // Decorrido real = 3 min - 30s = 2 min 30s
    // Restante = 1 min - 2 min 30s = -1 min 30s
    expect(calculateTimeRemainingMs(match, oneMinuteLevel, now)).toBe(-90_000);
  });
});

describe("isLevelExpired", () => {
  it("retorna true quando tempo restante é 0", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:01:00Z").getTime();

    const match = { ...baseMatch, level_started_at: startedAt.toISOString() };
    expect(isLevelExpired(match, oneMinuteLevel, now)).toBe(true);
  });

  it("retorna true quando tempo restante é negativo", () => {
    const startedAt = new Date("2026-05-23T20:00:00Z");
    const now = new Date("2026-05-23T20:05:00Z").getTime();

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
