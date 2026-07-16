import { rawServiceClient } from "@/lib/tournament/auth";
import { getAsaasPaymentStatus, cancelAsaasPayment } from "@/lib/payments/asaas";
import { sendTicketEmail } from "@/lib/email/ticket-email";
import { processWebhookEvent } from "./webhook";
import { buildWebhookDeps } from "./webhook-deps";

type Fetch = typeof fetch;

const ASAAS_PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Um status do Asaas conta como pago? (pura, testavel) */
export function isAsaasPaid(status: string): boolean {
  return ASAAS_PAID.has(status);
}

export type ReconcileResult = {
  checked: number;
  confirmed: number;
  cleaned: number;
  items: { ticketId: string; status?: string; handled?: boolean; cleaned?: boolean; error?: string }[];
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
    .select("id,asaas_payment_id,event_id,created_at")
    .eq("status", "pending")
    .not("asaas_payment_id", "is", null);

  const rows = (pending ?? []) as { id: string; asaas_payment_id: string | null; event_id: string; created_at: string }[];
  const items: ReconcileResult["items"] = [];
  let confirmed = 0;
  let cleaned = 0;
  const nowMs = Date.now();

  // Cache do "evento lotou?" (capacidade vs pagos), pra a limpeza #8.
  const soldOutCache = new Map<string, boolean>();
  async function eventSoldOut(eventId: string): Promise<boolean> {
    const cached = soldOutCache.get(eventId);
    if (cached !== undefined) return cached;
    const { data: ev } = await db.from("events").select("capacity").eq("id", eventId).maybeSingle();
    const cap = (ev as { capacity: number | null } | null)?.capacity ?? null;
    let full = false;
    if (cap != null) {
      const { count } = await db.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "paid");
      full = (count ?? 0) >= cap;
    }
    soldOutCache.set(eventId, full);
    return full;
  }

  for (const t of rows) {
    if (!t.asaas_payment_id) continue;
    try {
      const st = await getAsaasPaymentStatus(t.asaas_payment_id, fetchImpl);
      if (isAsaasPaid(st.status)) {
        const r = await processWebhookEvent(
          { event: "PAYMENT_RECEIVED", payment: { id: t.asaas_payment_id, billingType: st.billingType } },
          deps,
        );
        if (r.handled) confirmed++;
        items.push({ ticketId: t.id, status: st.status, handled: r.handled });
        continue;
      }
      // Limpeza (#8): cobranca vencida, OU pendente ha mais de 2 dias, OU o
      // evento ja lotou -> cancela a cobranca no Asaas e marca canceled.
      const stale = nowMs - new Date(t.created_at).getTime() > TWO_DAYS_MS;
      if (st.status === "OVERDUE" || stale || (await eventSoldOut(t.event_id))) {
        await cancelAsaasPayment(t.asaas_payment_id, fetchImpl).catch(() => undefined);
        await db.from("tickets").update({ status: "canceled" }).eq("id", t.id);
        cleaned++;
        items.push({ ticketId: t.id, status: st.status, cleaned: true });
      } else {
        items.push({ ticketId: t.id, status: st.status, handled: false });
      }
    } catch (err) {
      items.push({ ticketId: t.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { checked: rows.length, confirmed, cleaned, items };
}

/**
 * Reenvia o e-mail do ingresso pra TODOS os pagos (pra rodar na vespera do
 * evento, ou se a entrega falhou). Idempotente: so re-manda, nao muda nada. #3.
 */
export async function resendAllPaidTickets(): Promise<{ total: number; sent: number; failed: number }> {
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data } = await db
    .from("tickets")
    .select("id,buyer_email,buyer_name,ticket_type_id,event_id,qr_token")
    .eq("status", "paid")
    .not("qr_token", "is", null);
  const rows = (data ?? []) as {
    id: string; buyer_email: string | null; buyer_name: string | null;
    ticket_type_id: string; event_id: string; qr_token: string;
  }[];

  let sent = 0;
  let failed = 0;
  for (const t of rows) {
    if (!t.buyer_email) {
      failed++;
      continue;
    }
    try {
      const { data: tt } = await db.from("ticket_types").select("name").eq("id", t.ticket_type_id).maybeSingle();
      const { data: ev } = await db.from("events").select("starts_at,location_text").eq("id", t.event_id).maybeSingle();
      const whenText = ev?.starts_at
        ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
        : "";
      await sendTicketEmail({
        to: t.buyer_email,
        buyerName: t.buyer_name ?? t.buyer_email.split("@")[0] ?? t.buyer_email,
        ticketName: tt?.name ?? "Ingresso",
        whenText,
        locationText: ev?.location_text ?? "",
        ticketUrl: `${siteUrl}/ingresso/${t.qr_token}`,
      });
      sent++;
    } catch {
      failed++;
    }
  }
  return { total: rows.length, sent, failed };
}
