/**
 * Formata milissegundos como "MM:SS" (ou "-MM:SS" se negativo).
 *
 * V1.1: aceita valores negativos. Quando ms < 0, prefixa com '-'.
 * Útil pra TV mostrar "passou X de tempo" depois que o nível expirou.
 */
export function formatTime(ms: number): string {
  const isNegative = ms < 0;
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${mm}:${ss}`;
}
