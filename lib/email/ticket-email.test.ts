import { describe, it, expect } from "vitest";
import { buildTicketEmailHtml } from "./ticket-email";

describe("buildTicketEmailHtml", () => {
  it("inclui nome, plano, data, local e o link do ingresso", () => {
    const html = buildTicketEmailHtml({
      buyerName: "Ana",
      ticketName: "Open Bar",
      whenText: "11/07/2026 às 14h",
      locationText: "Solar da Serra",
      ticketUrl: "https://mesapigroup.com/ingresso/abc",
    });
    expect(html).toContain("Ana");
    expect(html).toContain("Open Bar");
    expect(html).toContain("11/07/2026");
    expect(html).toContain("Solar da Serra");
    expect(html).toContain("https://mesapigroup.com/ingresso/abc");
  });
});
