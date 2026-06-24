import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { rawServiceClient } from "@/lib/tournament/auth";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { sendTicketEmail } from "@/lib/email/ticket-email";

export async function POST(req: Request) {
  // Auth: o Asaas envia o token configurado no painel no header asaas-access-token.
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const result = await processWebhookEvent(payload, {
    async findTicketByPaymentId(paymentId) {
      const { data } = await db
        .from("tickets")
        .select("id,status,buyer_email,ticket_type_id,event_id")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();
      if (!data) return null;
      const { data: tt } = await db.from("ticket_types").select("name").eq("id", data.ticket_type_id).maybeSingle();
      const { data: ev } = await db.from("events").select("starts_at,location_text").eq("id", data.event_id).maybeSingle();
      const whenText = ev?.starts_at
        ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
        : "";
      return {
        id: data.id, status: data.status, buyer_email: data.buyer_email,
        ticket_name: tt?.name, when_text: whenText, location_text: ev?.location_text,
      };
    },
    async markPaid(ticketId, method) {
      const qrToken = nanoid(24);
      await db.from("tickets").update({
        status: "paid", paid_at: new Date().toISOString(), payment_method: method, qr_token: qrToken,
      }).eq("id", ticketId);
      return qrToken;
    },
    sendEmail: sendTicketEmail,
    siteUrl,
  });

  return NextResponse.json({ ok: true, ...result });
}
