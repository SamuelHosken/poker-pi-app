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
    description:
      "Estrutura da casa — 20 níveis. Início mais lento (níveis 1-4 com 20-25min), intervalo após o 4, depois 15min daqui pra frente. Segundo intervalo entre 10 e 11.",
    levels: [
      // 1ª etapa — abertura (níveis 1-4)
      { level: 1, smallBlind: 100, bigBlind: 100, ante: 0, durationMinutes: 25 },
      { level: 2, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 20 },
      { level: 3, smallBlind: 100, bigBlind: 300, ante: 0, durationMinutes: 20 },
      { level: 4, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 20 },
      // 1º intervalo (10 min) — admin pausa manualmente após o nível 4
      // 2ª etapa — 15 min por nível
      { level: 5, smallBlind: 300, bigBlind: 600, ante: 0, durationMinutes: 15 },
      { level: 6, smallBlind: 400, bigBlind: 800, ante: 0, durationMinutes: 15 },
      { level: 7, smallBlind: 500, bigBlind: 1000, ante: 0, durationMinutes: 15 },
      { level: 8, smallBlind: 600, bigBlind: 1200, ante: 0, durationMinutes: 15 },
      { level: 9, smallBlind: 700, bigBlind: 1400, ante: 0, durationMinutes: 15 },
      { level: 10, smallBlind: 800, bigBlind: 1600, ante: 0, durationMinutes: 15 },
      // 2º intervalo — admin pausa após o nível 10
      // 3ª etapa — finalização
      { level: 11, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 15 },
      { level: 12, smallBlind: 1500, bigBlind: 3000, ante: 0, durationMinutes: 15 },
      { level: 13, smallBlind: 2000, bigBlind: 4000, ante: 0, durationMinutes: 15 },
      { level: 14, smallBlind: 2500, bigBlind: 5000, ante: 0, durationMinutes: 15 },
      { level: 15, smallBlind: 3000, bigBlind: 6000, ante: 0, durationMinutes: 15 },
      { level: 16, smallBlind: 4000, bigBlind: 8000, ante: 0, durationMinutes: 15 },
      { level: 17, smallBlind: 5000, bigBlind: 10000, ante: 0, durationMinutes: 15 },
      { level: 18, smallBlind: 6000, bigBlind: 12000, ante: 0, durationMinutes: 15 },
      { level: 19, smallBlind: 8000, bigBlind: 16000, ante: 0, durationMinutes: 15 },
      { level: 20, smallBlind: 10000, bigBlind: 20000, ante: 0, durationMinutes: 15 },
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
