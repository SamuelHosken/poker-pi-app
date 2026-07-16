"use server";

import { requireAdmin } from "@/lib/tournament/auth";
import { reconcilePendingTickets, resendAllPaidTickets } from "@/lib/tickets/reconcile";

/**
 * Reconcilia ingressos pendentes contra o Asaas: confirma os que pagaram (marca
 * pago + QR + e-mail) e limpa os vencidos/velhos/lotados. Rede de seguranca
 * contra webhook perdido. So admin.
 */
export async function runReconcile(): Promise<{ checked: number; confirmed: number; cleaned: number }> {
  await requireAdmin();
  const r = await reconcilePendingTickets();
  return { checked: r.checked, confirmed: r.confirmed, cleaned: r.cleaned };
}

/**
 * Reenvia o e-mail do ingresso (com o QR) pra TODOS os pagos. Pra rodar na
 * vespera do evento ou se a entrega falhou. So admin.
 */
export async function runResend(): Promise<{ total: number; sent: number; failed: number }> {
  await requireAdmin();
  return resendAllPaidTickets();
}
