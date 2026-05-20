import type { BlindTemplateKey } from "@/lib/types/domain";

export type BlindLevelTemplate = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
};

export type BlindTemplate = {
  key: BlindTemplateKey;
  name: string;
  description: string;
  levels: ReadonlyArray<BlindLevelTemplate>;
};

/**
 * Templates de estrutura de blinds para classificatórias.
 * Valores em fichas (não dinheiro). Buy-in típico = 1500-2000 fichas.
 *
 * Heurística:
 * - Turbo: 10 níveis × 10 min ≈ 100 min (~2h com finais)
 * - Padrão: 12 níveis × 15 min = 180 min (~3h)
 * - Lento: 15 níveis × 20 min = 300 min (~4-5h)
 *
 * Antes só entra a partir do nível 5 (pressão pra forçar ação).
 */

export const BLIND_TEMPLATES: Record<BlindTemplateKey, BlindTemplate> = {
  turbo: {
    key: "turbo",
    name: "Turbo",
    description: "Eventos rápidos, ~2h",
    levels: [
      { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 10 },
      { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 10 },
      { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 10 },
      { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 10 },
      { level: 5, smallBlind: 150, bigBlind: 300, ante: 25, durationMinutes: 10 },
      { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 10 },
      { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 10 },
      { level: 8, smallBlind: 500, bigBlind: 1000, ante: 100, durationMinutes: 10 },
      { level: 9, smallBlind: 800, bigBlind: 1600, ante: 200, durationMinutes: 10 },
      { level: 10, smallBlind: 1200, bigBlind: 2400, ante: 300, durationMinutes: 10 },
    ],
  },
  padrao: {
    key: "padrao",
    name: "Padrão",
    description: "Eventos normais, ~3h",
    levels: [
      { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15 },
      { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 15 },
      { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 15 },
      { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 15 },
      { level: 5, smallBlind: 150, bigBlind: 300, ante: 25, durationMinutes: 15 },
      { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 15 },
      { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 15 },
      { level: 8, smallBlind: 400, bigBlind: 800, ante: 100, durationMinutes: 15 },
      { level: 9, smallBlind: 600, bigBlind: 1200, ante: 150, durationMinutes: 15 },
      { level: 10, smallBlind: 800, bigBlind: 1600, ante: 200, durationMinutes: 15 },
      { level: 11, smallBlind: 1200, bigBlind: 2400, ante: 300, durationMinutes: 15 },
      { level: 12, smallBlind: 1600, bigBlind: 3200, ante: 400, durationMinutes: 15 },
    ],
  },
  lento: {
    key: "lento",
    name: "Lento",
    description: "Eventos longos, ~4-5h",
    levels: [
      { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 20 },
      { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 20 },
      { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 20 },
      { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 20 },
      { level: 5, smallBlind: 125, bigBlind: 250, ante: 25, durationMinutes: 20 },
      { level: 6, smallBlind: 150, bigBlind: 300, ante: 25, durationMinutes: 20 },
      { level: 7, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 20 },
      { level: 8, smallBlind: 250, bigBlind: 500, ante: 50, durationMinutes: 20 },
      { level: 9, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 20 },
      { level: 10, smallBlind: 400, bigBlind: 800, ante: 100, durationMinutes: 20 },
      { level: 11, smallBlind: 500, bigBlind: 1000, ante: 125, durationMinutes: 20 },
      { level: 12, smallBlind: 700, bigBlind: 1400, ante: 175, durationMinutes: 20 },
      { level: 13, smallBlind: 900, bigBlind: 1800, ante: 200, durationMinutes: 20 },
      { level: 14, smallBlind: 1200, bigBlind: 2400, ante: 300, durationMinutes: 20 },
      { level: 15, smallBlind: 1600, bigBlind: 3200, ante: 400, durationMinutes: 20 },
    ],
  },
};

export function getBlindTemplate(key: BlindTemplateKey): BlindTemplate {
  return BLIND_TEMPLATES[key];
}
