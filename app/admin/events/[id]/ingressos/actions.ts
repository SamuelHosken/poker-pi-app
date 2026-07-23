"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/tournament/auth";
import { reconcilePendingTickets, resendAllPaidTickets } from "@/lib/tickets/reconcile";
import { confirmTicketPaid, addPaidTicket } from "@/lib/tickets/manual";

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

/** Confirma um PIX pendente (comprovante conferido): marca pago + QR + e-mail. */
export async function confirmPixTicket(eventId: string, ticketId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await confirmTicketPaid(ticketId);
  revalidatePath(`/admin/events/${eventId}/ingressos`);
  if (!r.handled) return { ok: false, error: r.reason };
  return { ok: true };
}

/** Adiciona um ingresso ja pago (caso avulso). */
export async function addTicketManually(input: {
  eventId: string;
  ticketTypeId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await addPaidTicket(input);
  revalidatePath(`/admin/events/${input.eventId}/ingressos`);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
