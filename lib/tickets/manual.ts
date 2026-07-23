// lib/tickets/manual.ts
// Modulo server-only (sem "use server"): chamado pelas server actions do admin,
// que fazem requireAdmin(). Nao expor direto ao cliente.

import { rawServiceClient } from "@/lib/tournament/auth";
import { onlyDigits, isValidCpf } from "./cpf";
import { hasCapacity } from "./capacity";
import { confirmTicket } from "./webhook";
import { buildWebhookDeps } from "./webhook-deps";

/**
 * Marca um ticket pago MANUALMENTE (PIX confirmado via comprovante). Reusa o
 * MESMO caminho do webhook: markPaid (gera QR, gate atomico) + e-mail. Sem
 * verificacao no Asaas, porque a conferencia do comprovante e humana.
 */
export async function confirmTicketPaid(ticketId: string): Promise<{ handled: boolean; reason?: string }> {
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Invariante: no maximo 1 pago por CPF+evento. Bloqueia se JA existe OUTRO
  // ticket pago com esse CPF (ex.: confirmar um pendente antigo depois de ja ter
  // adicionado o mesmo CPF na mao) - senao o CPF ficaria com 2 ingressos pagos.
  const { data: self } = await db
    .from("tickets")
    .select("event_id,buyer_cpf,status")
    .eq("id", ticketId)
    .maybeSingle();
  if (self && self.status !== "paid" && self.buyer_cpf) {
    const { data: dup } = await db
      .from("tickets")
      .select("id")
      .eq("event_id", self.event_id)
      .eq("buyer_cpf", self.buyer_cpf)
      .eq("status", "paid")
      .neq("id", ticketId);
    if ((dup ?? []).length > 0) return { handled: false, reason: "Ja existe um ingresso pago com esse CPF." };
  }

  const deps = buildWebhookDeps(db, siteUrl);
  const ticket = await deps.findTicketById(ticketId);
  return confirmTicket(ticket, "PIX", deps);
}

/**
 * Adiciona um ingresso ja pago pra casos avulsos (pagou sem passar pela LP).
 * Insere o ticket e confirma pelo mesmo caminho (QR + e-mail).
 */
export async function addPaidTicket(input: {
  eventId: string;
  ticketTypeId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = rawServiceClient();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const cpf = onlyDigits(input.cpf);
  if (name.length < 2) return { ok: false, error: "Nome invalido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail invalido." };
  if (!isValidCpf(cpf)) return { ok: false, error: "CPF invalido." };

  const { data: tt } = await db
    .from("ticket_types")
    .select("id,event_id,price_cents")
    .eq("id", input.ticketTypeId)
    .maybeSingle();
  if (!tt || tt.event_id !== input.eventId) return { ok: false, error: "Ingresso indisponivel." };

  // Dedup: bloqueia se ja existe pago com esse CPF nesse evento.
  const { data: dup } = await db
    .from("tickets")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("buyer_cpf", cpf)
    .eq("status", "paid");
  if ((dup ?? []).length > 0) return { ok: false, error: "Ja existe um ingresso pago com esse CPF." };

  // Capacidade.
  const { data: ev } = await db.from("events").select("capacity").eq("id", input.eventId).maybeSingle();
  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", input.eventId)
    .eq("status", "paid");
  if (!hasCapacity(count ?? 0, ev?.capacity ?? null)) return { ok: false, error: "Ingressos esgotados." };

  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: input.eventId,
      ticket_type_id: tt.id,
      buyer_name: name,
      buyer_email: email,
      buyer_phone: input.phone.trim(),
      buyer_cpf: cpf,
      amount_cents: tt.price_cents,
      charged_amount_cents: tt.price_cents,
      installments: 1,
      payment_method: "PIX",
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Nao foi possivel criar o ingresso." };

  const r = await confirmTicketPaid(ticket.id);
  if (!r.handled) return { ok: false, error: r.reason ?? "Falha ao confirmar." };
  return { ok: true };
}
