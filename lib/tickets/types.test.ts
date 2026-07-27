import { describe, it, expect } from "vitest";
import { mapTicketRow, type TicketStatus } from "./types";

describe("mapTicketRow", () => {
  it("aceita 'refunded', que a migration 0025 adicionou ao CHECK do banco", () => {
    // Se TicketStatus nao incluir "refunded", o tsc quebra nesta linha.
    const status: TicketStatus = "refunded";
    const t = mapTicketRow({
      id: "t1", event_id: "e1", ticket_type_id: "tt1",
      buyer_name: "Ana", buyer_email: "a@b.com", buyer_phone: "+5561999999999",
      buyer_cpf: "00000000000", amount_cents: 15000, status,
    });
    expect(t.status).toBe("refunded");
  });

  it("mapeia snake_case pra camelCase e usa null nos opcionais ausentes", () => {
    const t = mapTicketRow({
      id: "t1", event_id: "e1", ticket_type_id: "tt1",
      buyer_name: "Ana", buyer_email: "a@b.com", buyer_phone: "+5561999999999",
      buyer_cpf: "00000000000", amount_cents: 15000, status: "pending",
      charged_amount_cents: 15540, installments: 3, asaas_payment_id: "pay_9",
    });
    expect(t.chargedAmountCents).toBe(15540);
    expect(t.installments).toBe(3);
    expect(t.asaasPaymentId).toBe("pay_9");
    expect(t.qrToken).toBeNull();
    expect(t.paidAt).toBeNull();
  });
});
