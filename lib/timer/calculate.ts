import type { Tables } from "@/lib/types/database.types";
import type { MatchState } from "@/lib/types/domain";

type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

/**
 * Calcula o tempo restante do nível atual da partida, em milissegundos.
 *
 * REGRA INVIOLÁVEL: este é o ÚNICO local de cálculo de cronômetro.
 * Cliente apenas chama esta função; nenhuma lógica de `setInterval`
 * controlando contagem regressiva pode existir fora daqui.
 *
 * @returns ms restantes (>= 0). Retorna 0 se nível ainda não começou
 *          ou se tempo já acabou.
 */
export function calculateTimeRemainingMs(
  match: Pick<Match, "state" | "level_started_at" | "paused_at" | "total_paused_ms">,
  level: Pick<BlindLevel, "duration_minutes">,
  now: number = Date.now(),
): number {
  if (!match.level_started_at) return 0;

  const durationMs = level.duration_minutes * 60_000;
  const levelStarted = new Date(match.level_started_at).getTime();
  const totalPaused = Number(match.total_paused_ms ?? 0);

  let elapsed: number;
  const state = match.state as MatchState;
  if (state === "PAUSADA" && match.paused_at) {
    elapsed = new Date(match.paused_at).getTime() - levelStarted - totalPaused;
  } else {
    elapsed = now - levelStarted - totalPaused;
  }

  return Math.max(0, durationMs - elapsed);
}

/**
 * Indica se o nível atual já expirou (deve avançar).
 */
export function isLevelExpired(
  match: Pick<Match, "state" | "level_started_at" | "paused_at" | "total_paused_ms">,
  level: Pick<BlindLevel, "duration_minutes">,
  now: number = Date.now(),
): boolean {
  return calculateTimeRemainingMs(match, level, now) <= 0;
}
