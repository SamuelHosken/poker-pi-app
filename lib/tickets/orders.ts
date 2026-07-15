"use server";

import { headers } from "next/headers";
import { rawServiceClient } from "@/lib/tournament/auth";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import { onlyDigits } from "./cpf";
import { hasCapacity } from "./capacity";
import { mapTicketTypeRow, type TicketType, OrderSchema, type OrderInput, type OrderResult } from "./types";
import { createAsaasCheckout } from "@/lib/payments/asaas";
import { trackEvent } from "@/lib/analytics/track";

export type OrderMeta = { sessionId?: string | null; source?: string | null };

export async function getActiveEventPublic(): Promise<{
  event: { id: string; name: string; slug: string; startsAt: string; locationText: string; capacity: number | null; salesOpen: boolean };
  ticketTypes: TicketType[];
  soldCount: number;
} | null> {
  const db = rawServiceClient();
  const { data } = await db
    .from("events")
    .select("id,name,slug,starts_at,location_text,capacity,sales_open")
    .eq("sales_open", true)
    .order("starts_at", { ascending: true })
    .limit(1);
  const ev = data?.[0];
  if (!ev) return null;

  const { data: types } = await db
    .from("ticket_types")
    .select("*")
    .eq("event_id", ev.id)
    .eq("active", true)
    .order("sort_order");

  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id)
    .eq("status", "paid");

  return {
    event: {
      id: ev.id, name: ev.name, slug: ev.slug, startsAt: ev.starts_at,
      locationText: ev.location_text, capacity: ev.capacity, salesOpen: ev.sales_open,
    },
    ticketTypes: (types ?? []).map(mapTicketTypeRow),
    soldCount: count ?? 0,
  };
}

export async function createTicketOrder(input: OrderInput, meta?: OrderMeta): Promise<OrderResult> {
  const parsed = OrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Confira os dados.", field: first?.path[0] as keyof OrderInput };
  }
  const data = parsed.data;

  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    checkRateLimit(`ticket-order:${ip}`, 5, 10 * 60_000);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tente novamente." };
  }

  const db = rawServiceClient();

  const { data: tt } = await db
    .from("ticket_types")
    .select("id,event_id,name,price_cents")
    .eq("id", data.ticketTypeId)
    .maybeSingle();
  if (!tt) return { ok: false, error: "Ingresso indisponível." };

  const { data: ev } = await db
    .from("events")
    .select("capacity,sales_open,starts_at")
    .eq("id", tt.event_id)
    .maybeSingle();
  if (!ev || !ev.sales_open) return { ok: false, error: "As vendas estão fechadas." };

  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", tt.event_id)
    .eq("status", "paid");
  if (!hasCapacity(count ?? 0, ev.capacity)) {
    return { ok: false, error: "Ingressos esgotados." };
  }

  // 1) cria o ticket pendente (pra ter id como externalReference)
  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: tt.event_id,
      ticket_type_id: tt.id,
      buyer_name: data.name,
      buyer_email: data.email,
      buyer_phone: data.phone,
      buyer_cpf: onlyDigits(data.cpf),
      amount_cents: tt.price_cents,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Não foi possível iniciar a compra." };

  // Atribuição (sessão/origem) é best-effort e fica FORA do insert de propósito:
  // se a migration de analytics ainda não rodou, a compra não pode quebrar.
  if (meta?.sessionId || meta?.source) {
    try {
      await db
        .from("tickets")
        .update({ analytics_session_id: meta?.sessionId ?? null, source: meta?.source ?? null })
        .eq("id", ticket.id);
    } catch {
      // colunas ainda não existem — ignora
    }
  }

  // 2) cria o Checkout do Asaas (comprador escolhe PIX/à vista OU cartão até 12x)
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mesapigroup.com";
    const checkout = await createAsaasCheckout({
      ticketId: ticket.id,
      valueCents: tt.price_cents,
      itemName: `Ingresso ${tt.name} · Poker Pi`,
      successUrl: siteUrl,
      maxInstallments: 12,
    });
    await db.from("tickets").update({
      asaas_checkout_id: checkout.id,
      asaas_invoice_url: checkout.url,
    }).eq("id", ticket.id);

    await trackEvent({
      name: "order_created",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { amountCents: tt.price_cents, ticketId: ticket.id },
    });

    return { ok: true, invoiceUrl: checkout.url };
  } catch (err) {
    await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
    await trackEvent({
      name: "order_failed",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { error: err instanceof Error ? err.message : "unknown" },
    });
    return { ok: false, error: err instanceof Error ? err.message : "Falha no pagamento." };
  }
}
