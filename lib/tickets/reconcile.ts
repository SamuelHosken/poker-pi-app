import { rawServiceClient } from "@/lib/tournament/auth";
import { getAsaasPaymentStatus } from "@/lib/payments/asaas";
import { processWebhookEvent } from "./webhook";
import { buildWebhookDeps } from "./webhook-deps";

type Fetch = typeof fetch;

const ASAAS_PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

/** Um status do Asaas conta como pago? (pura, testavel) */
export function isAsaasPaid(status: string): boolean {
  return ASAAS_PAID.has(status);
}

export type ReconcileResult = {
  checked: number;
  confirmed: number;
  items: { ticketId: string; status?: string; handled?: boolean; error?: string }[];
};

/**
 * Rede de seguranca contra webhooks perdidos: varre os ingressos `pending` com
 * cobranca no Asaas, consulta o status de cada um e, se ja estiver pago,
 * confirma pelo MESMO caminho do webhook (marca pago, gera QR, manda e-mail).
 * Idempotente: ticket ja pago e ignorado dentro do processWebhookEvent.
 */
export async function reconcilePendingTickets(fetchImpl: Fetch = fetch): Promise<ReconcileResult> {
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const deps = buildWebhookDeps(db, siteUrl);

  const { data: pending } = await db
    .from("tickets")
    .select("id,asaas_payment_id")
    .eq("status", "pending")
    .not("asaas_payment_id", "is", null);

  const rows = (pending ?? []) as { id: string; asaas_payment_id: string | null }[];
  const items: ReconcileResult["items"] = [];
  let confirmed = 0;

  for (const t of rows) {
    if (!t.asaas_payment_id) continue;
    try {
      const st = await getAsaasPaymentStatus(t.asaas_payment_id, fetchImpl);
      if (!isAsaasPaid(st.status)) {
        items.push({ ticketId: t.id, status: st.status, handled: false });
        continue;
      }
      const r = await processWebhookEvent(
        { event: "PAYMENT_RECEIVED", payment: { id: t.asaas_payment_id, billingType: st.billingType } },
        deps,
      );
      if (r.handled) confirmed++;
      items.push({ ticketId: t.id, status: st.status, handled: r.handled });
    } catch (err) {
      items.push({ ticketId: t.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { checked: rows.length, confirmed, items };
}
