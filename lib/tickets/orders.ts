"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { rawServiceClient } from "@/lib/tournament/auth";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import { isValidCpf, onlyDigits } from "./cpf";
import { hasCapacity } from "./capacity";
import { mapTicketTypeRow, type TicketType } from "./types";
import { createAsaasCustomer, createAsaasPayment } from "@/lib/payments/asaas";

export const OrderSchema = z.object({
  ticketTypeId: z.string().uuid(),
  name: z.string().trim().min(2, "Digite seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,17}$/, "Telefone inválido."),
  cpf: z.string().trim().refine(isValidCpf, "CPF inválido."),
});

export type OrderInput = z.input<typeof OrderSchema>;
export type OrderResult =
  | { ok: true; invoiceUrl: string }
  | { ok: false; error: string; field?: keyof OrderInput };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getEventBySlugPublic(slug: string): Promise<{
  event: { id: string; name: string; slug: string; startsAt: string; locationText: string; capacity: number | null; salesOpen: boolean };
  ticketTypes: TicketType[];
  soldCount: number;
} | null> {
  const db = rawServiceClient();
  const { data: ev } = await db
    .from("events")
    .select("id,name,slug,starts_at,location_text,capacity,sales_open")
    .eq("slug", slug)
    .maybeSingle();
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

export async function createTicketOrder(input: OrderInput): Promise<OrderResult> {
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

  // 2) cria customer + cobrança no Asaas
  try {
    const customer = await createAsaasCustomer({
      name: data.name, email: data.email, phone: data.phone, cpf: onlyDigits(data.cpf),
    });
    const payment = await createAsaasPayment({
      customerId: customer.id,
      valueCents: tt.price_cents,
      description: `Ingresso ${tt.name} — Poker Pi`,
      externalReference: ticket.id,
      dueDate: todayIso(),
    });
    await db.from("tickets").update({
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      asaas_invoice_url: payment.invoiceUrl,
    }).eq("id", ticket.id);

    return { ok: true, invoiceUrl: payment.invoiceUrl };
  } catch (err) {
    await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
    return { ok: false, error: err instanceof Error ? err.message : "Falha no pagamento." };
  }
}
