import { describe, it, expect } from "vitest";
import { OrderSchema } from "./orders";

describe("OrderSchema", () => {
  it("aceita entrada válida", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "11111111-1111-1111-1111-111111111111",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "529.982.247-25",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita CPF inválido", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "11111111-1111-1111-1111-111111111111",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "111.111.111-11",
    });
    expect(r.success).toBe(false);
  });
});
