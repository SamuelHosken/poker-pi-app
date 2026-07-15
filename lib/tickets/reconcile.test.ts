import { describe, expect, it } from "vitest";
import { isAsaasPaid } from "./reconcile";

describe("isAsaasPaid", () => {
  it("considera pago os status de confirmacao/recebimento", () => {
    expect(isAsaasPaid("CONFIRMED")).toBe(true);
    expect(isAsaasPaid("RECEIVED")).toBe(true);
    expect(isAsaasPaid("RECEIVED_IN_CASH")).toBe(true);
  });

  it("nao considera pago os demais status", () => {
    expect(isAsaasPaid("PENDING")).toBe(false);
    expect(isAsaasPaid("OVERDUE")).toBe(false);
    expect(isAsaasPaid("REFUNDED")).toBe(false);
    expect(isAsaasPaid("")).toBe(false);
  });
});
