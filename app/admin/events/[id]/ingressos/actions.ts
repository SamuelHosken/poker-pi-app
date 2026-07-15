"use server";

import { requireAdmin } from "@/lib/tournament/auth";
import { reconcilePendingTickets } from "@/lib/tickets/reconcile";

/**
 * Reconcilia ingressos pendentes contra o Asaas (marca pago + QR + e-mail nos
 * que ja pagaram). Rede de seguranca contra webhook perdido. So admin.
 */
export async function runReconcile(): Promise<{ checked: number; confirmed: number }> {
  await requireAdmin();
  const r = await reconcilePendingTickets();
  return { checked: r.checked, confirmed: r.confirmed };
}
