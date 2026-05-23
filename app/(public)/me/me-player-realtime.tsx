"use client";

import { usePlayerRefresh } from "@/lib/realtime/avatar-broadcast";

/**
 * Cliente-mounted hook holder. Quando o admin marca/desmarca pago, adiciona
 * ou remove player do evento, broadcast cai aqui e o /me dá router.refresh()
 * imediato (sem esperar o LiveRefresh de 5s).
 */
export function MePlayerRealtime() {
  usePlayerRefresh();
  return null;
}
