import { nanoid } from "nanoid";
import type { WebhookDeps } from "./webhook";
import type { rawServiceClient } from "@/lib/tournament/auth";
import { sendTicketEmail } from "@/lib/email/ticket-email";
import { trackEvent } from "@/lib/analytics/track";

type ServiceClient = ReturnType<typeof rawServiceClient>;

/**
 * Monta as dependencias do processWebhookEvent (buscar ticket, marcar pago +
 * QR, mandar e-mail). Compartilhado entre o webhook do Asaas e a reconciliacao
 * de pendentes, pra que os dois confirmem o ingresso do MESMO jeito.
 */
export function buildWebhookDeps(db: ServiceClient, siteUrl: string): WebhookDeps {
  return {
    async findTicketByPaymentId(paymentId) {
      const { data } = await db
        .from("tickets")
        .select("id,status,buyer_email,buyer_name,ticket_type_id,event_id")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();
      if (!data) return null;
      const { data: tt } = await db.from("ticket_types").select("name").eq("id", data.ticket_type_id).maybeSingle();
      const { data: ev } = await db.from("events").select("starts_at,location_text").eq("id", data.event_id).maybeSingle();
      const whenText = ev?.starts_at
        ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
        : "";
      return {
        id: data.id, status: data.status, buyer_email: data.buyer_email, buyer_name: data.buyer_name ?? undefined,
        ticket_name: tt?.name, when_text: whenText, location_text: ev?.location_text,
      };
    },
    async markPaid(ticketId, method) {
      const qrToken = nanoid(24);
      const { error } = await db.from("tickets").update({
        status: "paid", paid_at: new Date().toISOString(), payment_method: method, qr_token: qrToken,
      }).eq("id", ticketId);
      if (error) throw new Error(`DB update failed: ${error.message}`);

      // Fecha o funil: registra o "paid" ligado a sessao/origem da compra.
      try {
        const { data: t } = await db
          .from("tickets")
          .select("analytics_session_id,source,amount_cents,event_id,ticket_type_id")
          .eq("id", ticketId)
          .maybeSingle();
        if (t) {
          const { data: tt } = await db.from("ticket_types").select("name").eq("id", t.ticket_type_id).maybeSingle();
          await trackEvent({
            name: "paid",
            sessionId: t.analytics_session_id,
            ref: t.source,
            plan: tt?.name ?? null,
            eventId: t.event_id,
            meta: { amountCents: t.amount_cents, method, ticketId },
          });
        }
      } catch {
        // rastreio e opcional
      }
      return qrToken;
    },
    sendEmail: async (args) => {
      try {
        await sendTicketEmail(args);
      } catch (err) {
        console.error("[webhook] sendEmail failed (swallowed):", err);
      }
    },
    siteUrl,
  };
}
