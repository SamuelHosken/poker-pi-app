/**
 * V1.3 — Rate limiter in-memory por chave (ex.: userId + ação).
 *
 * Limitações conhecidas:
 *   - State vive no processo Node. Em deploy multi-instância (Vercel,
 *     etc) cada instância tem o seu — limite efetivo = N × limit.
 *   - Re-inicia ao restartar o servidor.
 *
 * Pra V1.3 (single instance no Mac local) é suficiente. Quando for pro
 * Vercel sério, troca pra Upstash Redis com a mesma assinatura.
 */

type Bucket = {
  // timestamps de tentativas dentro da janela atual (ms desde epoch)
  hits: number[];
};

const store = new Map<string, Bucket>();

// Limpeza periódica de buckets vazios pra não vazar memória
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.hits.length === 0) store.delete(key);
  }
}

/**
 * Aplica sliding window. Joga `Error` quando o limite excedeu.
 * `key`: identificador único (geralmente `${action}:${userId}`).
 * `limit`: tentativas máximas dentro da janela.
 * `windowMs`: janela em milissegundos.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { remaining: number; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);

  const bucket = store.get(key) ?? { hits: [] };
  // Remove hits fora da janela
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfterMs = windowMs - (now - oldest);
    const err = new Error(
      `Calma — aguarde ${Math.ceil(retryAfterMs / 1000)}s antes de tentar de novo.`,
    );
    (err as Error & { rateLimited?: boolean }).rateLimited = true;
    throw err;
  }

  bucket.hits.push(now);
  store.set(key, bucket);
  return {
    remaining: limit - bucket.hits.length,
    retryAfterMs: 0,
  };
}
