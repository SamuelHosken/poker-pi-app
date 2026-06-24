import { describe, it, expect } from "vitest";
import { OrderSchema } from "./types";

describe("OrderSchema", () => {
  it("aceita entrada válida", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "529.982.247-25",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita CPF inválido", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "111.111.111-11",
    });
    expect(r.success).toBe(false);
  });
});
