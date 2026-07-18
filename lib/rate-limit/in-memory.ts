/**
 * V1.3 — Rate limiter in-memory por chave (ex.: userId + ação).
 *
 * Limitações conhecidas:
 *   - State vive no processo Node. Em deploy multi-instância (Vercel,
 *     etc) cada instância tem o seu — limite efetivo = N × limit.
 *   - Re-inicia ao restartar o servidor.
 *
 * BEST-EFFORT em serverless (Vercel): cada instância tem o seu store, então o
 * limite efetivo é N × limit e não protege de verdade num deploy multi-instância.
 * Serve como amortecedor de rajada, NÃO como proteção forte. A defesa real do
 * caminho de dinheiro é a idempotência (reuso de cobrança PENDING). Um limiter
 * durável (Upstash Redis / Vercel KV / contador no Postgres) é follow-up.
 */

type Bucket = {
  // timestamps de tentativas dentro da janela atual (ms desde epoch)
  hits: number[];
};

const store = new Map<string, Bucket>();

// TTL de segurança: acima de qualquer janela real usada. Um bucket cujo hit
// mais novo é mais velho que isto nunca mais será consultado dentro da janela.
const MAX_BUCKET_TTL_MS = 15 * 60_000;

// Limpeza periódica pra não vazar memória: remove buckets vazios E buckets
// cujo hit mais recente já saiu de qualquer janela plausível (antes só os
// vazios eram removidos, então chaves nunca revisitadas vazavam pra sempre).
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (bucket.hits.length === 0 || newest === undefined || now - newest > MAX_BUCKET_TTL_MS) {
      store.delete(key);
    }
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
