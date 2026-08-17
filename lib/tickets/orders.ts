"use server";

import { headers } from "next/headers";
import { rawServiceClient } from "@/lib/tournament/auth";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import { onlyDigits } from "./cpf";
import { hasCapacity } from "./capacity";
import { mapTicketTypeRow, type TicketType, OrderSchema, type OrderInput, type OrderResult } from "./types";
import {
  createAsaasCustomer,
  createAsaasPayment,
  cancelAsaasPayment,
  getAsaasPaymentStatus,
} from "@/lib/payments/asaas";
import { createAbacatePixCharge } from "@/lib/payments/abacate";
import { cardTotalCents } from "./pricing";
import { resolvePixProvider, PIX_EXPIRA_SEGUNDOS } from "./pix-provider";
import { trackEvent } from "@/lib/analytics/track";
import { blocksNewPaidTicket, pendingToCancel, type CpfTicketRow } from "./dedup";

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

/**
 * Só o id da edição em venda, sem os planos e sem a contagem de vendidos.
 *
 * Existe por causa do volume: o rastreio do funil resolve a edição a CADA evento
 * do site, e `getActiveEventPublic` custa três consultas (evento, tipos e
 * contagem de pagos) para devolver duas coisas que ali ninguém usa. Uma visita
 * gera de 1 a 5 eventos, e a conta cresce por visitante.
 *
 * `null` quando não há venda aberta, e quem chama decide o que fazer com isso.
 */
export async function idDaEdicaoEmVenda(): Promise<string | null> {
  const db = rawServiceClient();
  const { data } = await db
    .from("events")
    .select("id")
    .eq("sales_open", true)
    .order("starts_at", { ascending: true })
    .limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
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

  // Dedup por CPF: no maximo 1 cobranca pendente por CPF. Se ja pagou, bloqueia.
  // Se tem pendentes antigas (a pessoa clicou "comprar" varias vezes), cancela a
  // cobranca no Asaas e marca canceled ANTES de criar a nova - assim ela nunca
  // paga duas cobrancas. Antes de cancelar, re-verifica no Asaas: se a antiga ja
  // foi paga (webhook nao processou ainda), NAO cancela e bloqueia.
  const cpf = onlyDigits(data.cpf);
  const { data: sameCpf } = await db
    .from("tickets")
    .select("id, status, asaas_payment_id")
    .eq("event_id", tt.event_id)
    .eq("buyer_cpf", cpf)
    .in("status", ["paid", "pending"]);
  const cpfRows = (sameCpf ?? []) as CpfTicketRow[];
  if (blocksNewPaidTicket(cpfRows)) {
    return { ok: false, error: "Você já tem um ingresso com esse CPF. Confira seu e-mail." };
  }
  for (const old of pendingToCancel(cpfRows)) {
    if (old.asaas_payment_id) {
      let realStatus: string | null = null;
      try {
        realStatus = (await getAsaasPaymentStatus(old.asaas_payment_id)).status;
      } catch {
        /* se nao deu pra checar, segue e cancela (era pendente no nosso banco) */
      }
      if (realStatus && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(realStatus)) {
        return { ok: false, error: "Você já pagou um ingresso com esse CPF. Confira seu e-mail." };
      }
      await cancelAsaasPayment(old.asaas_payment_id).catch(() => undefined);
    }
    await db.from("tickets").update({ status: "canceled" }).eq("id", old.id);
  }

  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", tt.event_id)
    .eq("status", "paid");
  if (!hasCapacity(count ?? 0, ev.capacity)) {
    return { ok: false, error: "Ingressos esgotados." };
  }

  // Pricing: PIX = valor cheio, cobrado FORA do Asaas (manual, comprovante por
  // WhatsApp). Cartao = juros do Asaas repassado (gross-up) via a MESMA
  // funcao que a LP usa pra exibir (cardTotalCents) - display e cobranca batem.
  const method = data.method;
  const installments = method === "CREDIT_CARD" ? data.installments : 1;
  const baseCents = tt.price_cents;
  const chargedCents = method === "CREDIT_CARD" ? cardTotalCents(baseCents, installments) : baseCents;

  // 1) cria o ticket pendente (pra ter id como externalReference / registro do PIX)
  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: tt.event_id,
      ticket_type_id: tt.id,
      buyer_name: data.name,
      buyer_email: data.email,
      buyer_phone: data.phone,
      buyer_cpf: onlyDigits(data.cpf),
      amount_cents: baseCents,
      charged_amount_cents: chargedCents,
      installments,
      payment_method: method,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Não foi possível iniciar a compra." };

  // Atribuicao (sessao/origem) best-effort, FORA do insert de proposito.
  if (meta?.sessionId || meta?.source) {
    try {
      await db
        .from("tickets")
        .update({ analytics_session_id: meta?.sessionId ?? null, source: meta?.source ?? null })
        .eq("id", ticket.id);
    } catch {
      // colunas ainda não existem - ignora
    }
  }

  if (method === "PIX") {
    const rastro = {
      name: "order_created" as const,
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { amountCents: baseCents, chargedCents, method, installments, ticketId: ticket.id },
    };

    /*
      Pix por gateway (AbacatePay, checkout transparente).

      O QR nasce aqui e volta para a tela: o comprador nao sai da pagina e nao
      manda comprovante para ninguem. A confirmacao chega pelo webhook, e se ele
      se perder o `reconcilePendingTickets` pega depois.

      O valor cobrado e `baseCents`, o preco cheio do plano: no Pix nao ha
      gross-up nenhum, a taxa de R$0,80 e absorvida. `chargedCents` e igual a
      `baseCents` neste ramo (ver o calculo la em cima), entao display e cobranca
      batem por construcao.
    */
    if (resolvePixProvider({ PIX_PROVIDER: process.env.PIX_PROVIDER }) === "abacate") {
      try {
        const cobranca = await createAbacatePixCharge({
          amountCents: baseCents,
          description: `Ingresso ${tt.name} · Mesa Pi`,
          expiresInSeconds: PIX_EXPIRA_SEGUNDOS,
          customer: {
            name: data.name,
            email: data.email,
            taxId: cpf,
            cellphone: data.phone,
          },
          // Volta intacto no webhook, e e o unico fio entre a cobranca deles e
          // o nosso ticket alem do id, que ja e guardado na coluna.
          metadata: { ticketId: ticket.id },
        });

        /*
          O ERRO DESTE UPDATE NAO PODE SER ENGOLIDO.

          `abacate_charge_id` e o UNICO fio entre a cobranca deles e o nosso
          ticket: e por ele que o webhook acha a linha, e e por ele que o
          reconcile varre. Se o update falhar (migration 0031 nao aplicada,
          cache de schema velho, RLS) e a gente seguir mostrando o QR, o
          comprador paga e o dinheiro entra numa cobranca que o nosso lado nao
          sabe de quem e. Ninguem conserta isso sozinho depois.

          Entao: cancela o ticket, cancela a intencao, e devolve erro. Melhor a
          compra nao acontecer do que acontecer sem rastro.
        */
        const { error: erroVinculo } = await db
          .from("tickets")
          .update({
            provider: "abacate",
            abacate_charge_id: cobranca.id,
          })
          .eq("id", ticket.id);

        if (erroVinculo) {
          await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
          console.error(
            `[orders] cobranca ${cobranca.id} criada mas NAO vinculada ao ticket ${ticket.id}: ${erroVinculo.message}`,
          );
          return {
            ok: false,
            error: "Não foi possível gerar o Pix. Tente de novo em instantes.",
          };
        }

        await trackEvent(rastro);
        return {
          ok: true,
          pixQr: {
            ticketId: ticket.id,
            brCode: cobranca.brCode,
            brCodeBase64: cobranca.brCodeBase64,
            expiresAt: cobranca.expiresAt,
            amountCents: cobranca.amountCents,
          },
        };
      } catch (err) {
        /*
          Mesma politica do cartao logo abaixo: cobranca que nao nasceu deixa
          ticket pendente eterno no caixa e no dedup por CPF, entao a linha e
          cancelada antes de devolver o erro.
        */
        await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
        console.error("[orders] AbacatePay falhou:", err);
        return { ok: false, error: "Não foi possível gerar o Pix. Tente de novo." };
      }
    }

    // PIX manual: NAO cria cobranca em gateway nenhum. O ticket fica pending
    // ate o admin confirmar o comprovante (marca pago, gera QR, manda e-mail).
    await trackEvent(rastro);
    return { ok: true, pix: true, ticketId: ticket.id };
  }

  // 2) cartao: cria customer + cobranca no Asaas
  try {
    const dueDate = new Date().toISOString().slice(0, 10);
    const customer = await createAsaasCustomer({
      name: data.name, email: data.email, phone: data.phone, cpf: onlyDigits(data.cpf),
    });
    const payment = await createAsaasPayment({
      customerId: customer.id,
      valueCents: chargedCents,
      description: `Ingresso ${tt.name} · Poker Pi`,
      externalReference: ticket.id,
      dueDate,
      billingType: method,
      installments,
    });
    await db.from("tickets").update({
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      asaas_invoice_url: payment.invoiceUrl,
    }).eq("id", ticket.id);

    await trackEvent({
      name: "order_created",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { amountCents: baseCents, chargedCents, method, installments, ticketId: ticket.id },
    });

    return { ok: true, invoiceUrl: payment.invoiceUrl };
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
