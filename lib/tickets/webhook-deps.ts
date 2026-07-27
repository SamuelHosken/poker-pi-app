import { nanoid } from "nanoid";
import type { WebhookDeps } from "./webhook";
import type { rawServiceClient } from "@/lib/tournament/auth";
import { sendTicketEmail } from "@/lib/email/ticket-email";
import { getAsaasPaymentStatus } from "@/lib/payments/asaas";
import { trackEvent } from "@/lib/analytics/track";

const ASAAS_PAID = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

type ServiceClient = ReturnType<typeof rawServiceClient>;

/**
 * Monta as dependencias do processWebhookEvent (buscar ticket, marcar pago +
 * QR, mandar e-mail). Compartilhado entre o webhook do Asaas e a reconciliacao
 * de pendentes, pra que os dois confirmem o ingresso do MESMO jeito.
 */
export function buildWebhookDeps(db: ServiceClient, siteUrl: string): WebhookDeps {
  // Hidrata a linha do ticket com nome do plano + data/local do evento.
  type TicketRow = {
    id: string; status: string; buyer_email: string; buyer_name: string | null;
    ticket_type_id: string; event_id: string;
  };
  async function hydrate(data: TicketRow) {
    const { data: tt } = await db.from("ticket_types").select("name").eq("id", data.ticket_type_id).maybeSingle();
    const { data: ev } = await db.from("events").select("starts_at,location_text").eq("id", data.event_id).maybeSingle();
    const whenText = ev?.starts_at
      ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
      : "";
    return {
      id: data.id, status: data.status, buyer_email: data.buyer_email, buyer_name: data.buyer_name ?? undefined,
      ticket_name: tt?.name, when_text: whenText, location_text: ev?.location_text,
    };
  }
  const TICKET_COLS = "id,status,buyer_email,buyer_name,ticket_type_id,event_id";

  return {
    async findTicketByPaymentId(paymentId) {
      const { data } = await db.from("tickets").select(TICKET_COLS).eq("asaas_payment_id", paymentId).maybeSingle();
      return data ? hydrate(data as TicketRow) : null;
    },
    async findTicketByCheckoutId(checkoutId) {
      const { data } = await db.from("tickets").select(TICKET_COLS).eq("asaas_checkout_id", checkoutId).maybeSingle();
      return data ? hydrate(data as TicketRow) : null;
    },
    async findTicketById(ticketId) {
      const { data } = await db.from("tickets").select(TICKET_COLS).eq("id", ticketId).maybeSingle();
      return data ? hydrate(data as TicketRow) : null;
    },
    async verifyPaymentPaid(paymentId) {
      try {
        const { status } = await getAsaasPaymentStatus(paymentId);
        return ASAAS_PAID.has(status);
      } catch {
        // Se nao deu pra falar com o Asaas, NAO confirma (fail-safe: melhor
        // segurar do que marcar pago sem certeza; a reconciliacao pega depois).
        return false;
      }
    },
    async markRefunded(ticketId) {
      const { error } = await db.from("tickets").update({ status: "refunded" }).eq("id", ticketId);
      // Nao engolir: se o UPDATE falha (ex.: CHECK constraint), o estorno vira
      // no-op silencioso e a vaga nunca e liberada. Lanca pra o Asaas re-tentar.
      if (error) throw new Error(`markRefunded failed: ${error.message}`);
    },
    async markPaid(ticketId, method) {
      const qrToken = nanoid(24);
      // UPDATE atomico: so a chamada que achar o ticket ainda 'pending' vence.
      // Entregas concorrentes do mesmo pagamento (CONFIRMED + RECEIVED, retries)
      // afetam 0 linhas -> retornam null, sem reenviar e-mail nem sobrescrever o QR.
      const { data, error } = await db.from("tickets").update({
        status: "paid", paid_at: new Date().toISOString(), payment_method: method, qr_token: qrToken,
      }).eq("id", ticketId).eq("status", "pending").select("id").maybeSingle();
      if (error) {
        // 23505 = unique_violation: outro ticket do mesmo CPF ja esta pago
        // (invariante I1, indice uq_tickets_one_paid_per_cpf_event). Nao e erro
        // de infra: e a constraint funcionando.
        //
        // Este branch (UPDATE casou a linha em 'pending' e bateu na constraint)
        // e SEMPRE o caso grave: dinheiro ja capturado DESTE ticket, mas o
        // UPDATE foi barrado porque OUTRO ticket do mesmo CPF/evento ja esta
        // paid. O caso benigno (entrega concorrente do MESMO pagamento) nao
        // cai aqui: o UPDATE dele perde no .eq("status","pending"), afeta 0
        // linhas, volta SEM erro, e cai no `if (!data) return null` abaixo.
        //
        // Nada no sistema conserta isto sozinho: reconcilePendingTickets (ver
        // lib/tickets/reconcile.ts) reconsulta o Asaas, ve que esta pago,
        // chama processWebhookEvent de novo, cai neste MESMO branch de novo, e
        // NUNCA cancela por idade (o `continue` do ramo "pago" roda antes da
        // checagem de 2 dias). O ticket fica preso em 'pending' pra sempre,
        // dinheiro capturado e ingresso nunca emitido, ate um humano intervir
        // na mao (reembolsar ou realocar manualmente no banco). Alem disso,
        // reconcilePendingTickets nao e cron: so roda quando um admin aperta o
        // botao no painel. Este log e a UNICA pista que o time vai ter pra
        // detectar o problema. Nao silenciar.
        if ((error as { code?: string }).code === "23505") {
          console.error(
            `[webhook] markPaid: dinheiro capturado sem ingresso emitido (ticket ${ticketId} preso em 'pending', constraint 23505 barrou o UPDATE) - requer intervencao manual, nada no sistema resolve isto sozinho`
          );
          return null;
        }
        throw new Error(`DB update failed: ${error.message}`);
      }
      if (!data) return null; // perdeu a corrida ou nao estava mais 'pending'

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
    async recordEvent({ provider, event, paymentId, raw }) {
      // `webhook_events` nao esta em database.types.ts (mantido a mao, e nao
      // inclui as tabelas de ticket), entao esta chamada e untyped, igual as
      // outras deste arquivo que tocam `tickets`.
      //
      // Best-effort: NAO lanca, NAO propaga (o `.catch(() => undefined)` do
      // caller e a rede final). Mas o supabase-js NAO lanca sozinho sem
      // `.throwOnError()` - se o insert falhar (migration 0029 nao aplicada,
      // RLS errada, schema cache velho), o `error` fica mudo e o log forense
      // simplesmente some sem ninguem notar. Por isso capturamos e logamos.
      const { error } = await db.from("webhook_events").insert({
        provider, event, payment_id: paymentId, raw,
      });
      if (error) {
        console.error(`[webhook] recordEvent falhou (${provider}/${event}):`, error.message);
      }
    },
    siteUrl,
  };
}
