import { z } from "zod";
import { isValidCpf } from "./cpf";
import { MAX_INSTALLMENTS } from "./pricing";

export const OrderSchema = z.object({
  ticketTypeId: z.string().uuid(),
  name: z.string().trim().min(2, "Digite seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,17}$/, "Telefone inválido."),
  cpf: z.string().trim().refine(isValidCpf, "CPF inválido."),
  // Forma de pagamento escolhida na LP. PIX = valor cheio; cartão = com juros.
  method: z.enum(["PIX", "CREDIT_CARD"]),
  // Parcelas (só relevante no cartão). PIX ignora e usa 1.
  installments: z.number().int().min(1).max(MAX_INSTALLMENTS).default(1),
});

export type OrderInput = z.input<typeof OrderSchema>;

/** O QR do Pix pronto para a tela, sem o comprador sair da pagina. */
export type PixQrCode = {
  ticketId: string;
  /** Copia e cola. */
  brCode: string;
  /** PNG ja como data URI, pronto para o <img src>. */
  brCodeBase64: string;
  /** Quando o QR morre. ISO. */
  expiresAt: string | null;
  /** O que vai ser cobrado, em centavos. Para a tela nunca recalcular preco. */
  amountCents: number;
};

export type OrderResult =
  | { ok: true; invoiceUrl: string }
  /** Pix MANUAL: chave estatica, comprovante por WhatsApp, admin confirma. */
  | { ok: true; pix: true; ticketId: string }
  /** Pix por gateway: QR na propria tela, confirmacao automatica por webhook. */
  | { ok: true; pixQr: PixQrCode }
  | { ok: false; error: string; field?: keyof OrderInput };

// 'refunded' entrou no CHECK do banco na migration 0025 (estorno/chargeback
// libera a vaga). Manter esta uniao em sincronia com o CHECK: sem isso,
// mapTicketRow faz cast de um valor real pra um tipo que nao o inclui.
export type TicketStatus = "pending" | "paid" | "canceled" | "refunded";

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export type Ticket = {
  id: string;
  eventId: string;
  ticketTypeId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCpf: string;
  amountCents: number; // preço base do ingresso (o que você recebe líquido)
  chargedAmountCents: number | null; // o que o comprador paga (com juros no cartão)
  installments: number | null; // parcelas escolhidas (1 = à vista)
  status: TicketStatus;
  asaasCustomerId: string | null;
  asaasPaymentId: string | null;
  asaasInvoiceUrl: string | null;
  paymentMethod: string | null;
  qrToken: string | null;
  paidAt: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  playerId: string | null;
};

/** Converte uma linha snake_case do Supabase (untyped) pro tipo camelCase. */
export function mapTicketRow(r: Record<string, unknown>): Ticket {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    ticketTypeId: r.ticket_type_id as string,
    buyerName: r.buyer_name as string,
    buyerEmail: r.buyer_email as string,
    buyerPhone: r.buyer_phone as string,
    buyerCpf: r.buyer_cpf as string,
    amountCents: r.amount_cents as number,
    chargedAmountCents: (r.charged_amount_cents as number) ?? null,
    installments: (r.installments as number) ?? null,
    status: r.status as TicketStatus,
    asaasCustomerId: (r.asaas_customer_id as string) ?? null,
    asaasPaymentId: (r.asaas_payment_id as string) ?? null,
    asaasInvoiceUrl: (r.asaas_invoice_url as string) ?? null,
    paymentMethod: (r.payment_method as string) ?? null,
    qrToken: (r.qr_token as string) ?? null,
    paidAt: (r.paid_at as string) ?? null,
    checkedInAt: (r.checked_in_at as string) ?? null,
    checkedInBy: (r.checked_in_by as string) ?? null,
    playerId: (r.player_id as string) ?? null,
  };
}

export function mapTicketTypeRow(r: Record<string, unknown>): TicketType {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    priceCents: r.price_cents as number,
    sortOrder: r.sort_order as number,
    active: r.active as boolean,
    createdAt: r.created_at as string,
  };
}
