import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { rawServiceClient } from "@/lib/tournament/auth";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { sendTicketEmail } from "@/lib/email/ticket-email";
import { trackEvent } from "@/lib/analytics/track";

export async function POST(req: Request) {
  // Auth: o Asaas envia o token configurado no painel no header asaas-access-token.
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  let result: Awaited<ReturnType<typeof processWebhookEvent>>;
  try {
    result = await processWebhookEvent(payload, {
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

        // Fecha o funil: registra o "paid" ligado à sessão/origem da compra.
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
          // rastreio é opcional
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
    });
  } catch (err) {
    console.error("[webhook] processWebhookEvent failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
