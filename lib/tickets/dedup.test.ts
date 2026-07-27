import { describe, it, expect } from "vitest";
import { blocksNewPaidTicket, pendingToCancel, type CpfTicketRow } from "./dedup";

const row = (over: Partial<CpfTicketRow> & { id: string }): CpfTicketRow => ({
  status: "pending",
  asaas_payment_id: null,
  ...over,
});

describe("blocksNewPaidTicket", () => {
  it("bloqueia quando ja existe um pago com esse CPF no evento", () => {
    expect(blocksNewPaidTicket([row({ id: "t1", status: "paid" })])).toBe(true);
  });

  it("nao bloqueia quando so existem pendentes", () => {
    expect(blocksNewPaidTicket([row({ id: "t1" }), row({ id: "t2" })])).toBe(false);
  });

  it("nao bloqueia com a lista vazia", () => {
    expect(blocksNewPaidTicket([])).toBe(false);
  });

  it("ignora o proprio ticket: confirmar um pendente que ja virou pago nao se auto-bloqueia", () => {
    expect(blocksNewPaidTicket([row({ id: "t1", status: "paid" })], "t1")).toBe(false);
  });

  it("bloqueia quando existe OUTRO pago, mesmo confirmando um pendente", () => {
    const rows = [row({ id: "t1" }), row({ id: "t2", status: "paid" })];
    expect(blocksNewPaidTicket(rows, "t1")).toBe(true);
  });

  it("canceled e refunded nao bloqueiam", () => {
    const rows = [row({ id: "t1", status: "canceled" }), row({ id: "t2", status: "refunded" })];
    expect(blocksNewPaidTicket(rows)).toBe(false);
  });
});

describe("pendingToCancel", () => {
  it("devolve so os pendentes", () => {
    const rows = [
      row({ id: "t1" }),
      row({ id: "t2", status: "canceled" }),
      row({ id: "t3", asaas_payment_id: "pay_9" }),
    ];
    expect(pendingToCancel(rows).map((r) => r.id)).toEqual(["t1", "t3"]);
  });

  it("nunca devolve o proprio ticket", () => {
    const rows = [row({ id: "t1" }), row({ id: "t2" })];
    expect(pendingToCancel(rows, "t1").map((r) => r.id)).toEqual(["t2"]);
  });

  it("preserva o asaas_payment_id, que o caller usa pra cancelar a cobranca", () => {
    expect(pendingToCancel([row({ id: "t1", asaas_payment_id: "pay_9" })])[0]!.asaas_payment_id).toBe("pay_9");
  });
});
