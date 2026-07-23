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
