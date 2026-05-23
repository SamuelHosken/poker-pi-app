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
      "Estrutura da casa — 20 níveis (~5-6h). 1ª etapa com rebuy (25min), depois acelera. Intervalos: após nível 5 (add-on) e após nível 9 (color up).",
    levels: [
      // 1ª Etapa — período de rebuys (25 min por nível)
      { level: 1, smallBlind: 100, bigBlind: 100, ante: 0, durationMinutes: 25 },
      { level: 2, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 25 },
      { level: 3, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 25 },
      { level: 4, smallBlind: 400, bigBlind: 800, ante: 0, durationMinutes: 25 },
      { level: 5, smallBlind: 500, bigBlind: 1000, ante: 0, durationMinutes: 25 },
      // 1º intervalo (20 min) → Add-on gigante (pausa manualmente)
      // 2ª etapa — pós add-on (20 min por nível)
      { level: 6, smallBlind: 700, bigBlind: 1400, ante: 0, durationMinutes: 20 },
      { level: 7, smallBlind: 800, bigBlind: 1600, ante: 0, durationMinutes: 20 },
      { level: 8, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 20 },
      { level: 9, smallBlind: 1500, bigBlind: 3000, ante: 0, durationMinutes: 20 },
      // 2º intervalo (10 min) → Color up ficha 100 (pausa manualmente)
      // 3ª etapa — pós color up (15 min por nível)
      { level: 10, smallBlind: 2000, bigBlind: 4000, ante: 0, durationMinutes: 15 },
      { level: 11, smallBlind: 2500, bigBlind: 5000, ante: 0, durationMinutes: 15 },
      { level: 12, smallBlind: 3000, bigBlind: 6000, ante: 0, durationMinutes: 15 },
      { level: 13, smallBlind: 3500, bigBlind: 7000, ante: 0, durationMinutes: 15 },
      // Color up ficha 500 entre nível 14 e 15
      { level: 14, smallBlind: 4000, bigBlind: 8000, ante: 0, durationMinutes: 15 },
      { level: 15, smallBlind: 5000, bigBlind: 10000, ante: 0, durationMinutes: 15 },
      { level: 16, smallBlind: 6000, bigBlind: 12000, ante: 0, durationMinutes: 15 },
      { level: 17, smallBlind: 7000, bigBlind: 14000, ante: 0, durationMinutes: 15 },
      { level: 18, smallBlind: 8000, bigBlind: 16000, ante: 0, durationMinutes: 15 },
      // Color up ficha 1.000 entre nível 19 e 20
      { level: 19, smallBlind: 9000, bigBlind: 18000, ante: 0, durationMinutes: 15 },
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
