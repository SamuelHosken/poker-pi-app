/**
 * Timeout em toda chamada ao gateway de pagamento.
 *
 * Numa funcao serverless, um fetch pendurado consome o tempo inteiro da
 * invocacao e o comprador ve a compra travar sem erro nenhum. 8 segundos e
 * folgado pro gateway e curto o bastante pra sobrar tempo de responder direito.
 */
export const GATEWAY_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number = GATEWAY_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Distingue timeout de erro de rede: mascarar os dois como "falhou" apaga a
    // informacao que diz se o problema e nosso ou do gateway.
    if (controller.signal.aborted) {
      throw new Error(`Gateway timeout apos ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
