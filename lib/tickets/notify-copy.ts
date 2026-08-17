"use server";

// Avisa a v2 (dona do push) que alguem copiou a chave PIX. Server-to-server com
// segredo compartilhado. Best-effort: o aviso e nice-to-have e NUNCA pode quebrar
// o checkout, entao qualquer falha (rede, v2 fria, timeout) e engolida.
const V2_BASE = process.env.V2_BASE_URL || "https://app.mesapigroup.com";

export async function pingPixCopied(ticketId: string): Promise<void> {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret || !ticketId) return;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(`${V2_BASE}/api/internal/pix-copied`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ ticketId }),
      signal: ctrl.signal,
    });
  } catch {
    // best-effort: silencioso de proposito
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Avisa a v2 que um ingresso foi PAGO, para ela disparar o push aos admins.
 *
 * Mesmo desenho do `pingPixCopied`: server-to-server, segredo compartilhado, e
 * best-effort. A diferenca e o momento: este e chamado de dentro do
 * `confirmTicket`, o funil unico por onde todo ingresso vira pago, entao ele
 * cobre webhook, polling da tela do comprador, reconcile e confirmacao manual do
 * admin de uma vez so.
 *
 * A guarda de aviso unico vive do OUTRO lado (claim atomico em
 * `sale_notified_at`), e nao aqui: o certo e o dono da coluna decidir, senao
 * dois caminhos confirmando junto disparariam dois pushes.
 */
export async function pingVendaConfirmada(ticketId: string): Promise<void> {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret || !ticketId) return;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(`${V2_BASE}/api/internal/venda-confirmada`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ ticketId }),
      signal: ctrl.signal,
    });
  } catch {
    // best-effort: silencioso de proposito
  } finally {
    clearTimeout(timer);
  }
}
