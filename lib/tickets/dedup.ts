/**
 * Invariante I1: no maximo 1 ingresso PAGO por CPF por evento.
 *
 * Decisao pura, separada da orquestracao de Supabase, para ser testavel sem
 * banco. O caller e responsavel por fazer a query filtrando por
 * (event_id, buyer_cpf) e status in ('paid','pending').
 *
 * O banco tambem garante isso (indice unico parcial, migration 0028). Aqui e
 * so pra dar mensagem boa pro usuario antes de bater na constraint.
 */
export type CpfTicketRow = { id: string; status: string; asaas_payment_id: string | null };

/**
 * `selfId` e o ticket que esta sendo confirmado agora. Ele nao conta contra si
 * mesmo: sem isso, confirmar um pendente duas vezes se auto-bloquearia.
 */
export function blocksNewPaidTicket(rows: CpfTicketRow[], selfId?: string): boolean {
  return rows.some((r) => r.status === "paid" && r.id !== selfId);
}

/** Pendentes antigos do mesmo CPF, que o caller deve cancelar antes de criar a nova cobranca. */
export function pendingToCancel(rows: CpfTicketRow[], selfId?: string): CpfTicketRow[] {
  return rows.filter((r) => r.status === "pending" && r.id !== selfId);
}
