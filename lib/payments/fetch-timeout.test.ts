import { describe, it, expect, vi } from "vitest";
import { fetchWithTimeout, GATEWAY_TIMEOUT_MS } from "./fetch-timeout";

/** fetch que so resolve se o AbortController mandar abortar. */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  });

describe("fetchWithTimeout", () => {
  it("aborta e lanca mensagem de timeout quando o gateway nao responde", async () => {
    await expect(fetchWithTimeout(hangingFetch, "https://api.asaas.com/v3/payments", {}, 10))
      .rejects.toThrow("Gateway timeout apos 10ms");
  });

  it("devolve a resposta normalmente quando o gateway responde a tempo", async () => {
    const ok = new Response('{"id":"pay_1"}', { status: 200 });
    const fast: typeof fetch = vi.fn().mockResolvedValue(ok);
    const res = await fetchWithTimeout(fast, "https://api.asaas.com/v3/payments", { method: "POST" }, 500);
    expect(res.status).toBe(200);
  });

  it("propaga o init original (metodo e headers) e adiciona o signal", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await fetchWithTimeout(spy as unknown as typeof fetch, "https://x.test", {
      method: "POST",
      headers: { access_token: "k" },
    }, 500);
    const init = spy.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).access_token).toBe("k");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("propaga erro de rede que nao e timeout, sem mascarar", async () => {
    const boom: typeof fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(fetchWithTimeout(boom, "https://x.test", {}, 500))
      .rejects.toThrow("ECONNREFUSED");
  });

  it("o default e 8 segundos", () => {
    expect(GATEWAY_TIMEOUT_MS).toBe(8000);
  });
});
