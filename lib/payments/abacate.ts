import { resolveAbacateConfig } from "./abacate-config";
import { fetchWithTimeout } from "./fetch-timeout";

/**
 * Cliente da AbacatePay, só o pedaço que a venda de ingresso usa: Checkout
 * Transparente por Pix.
 *
 * Por que o transparente e não o checkout hospedado, que é o mais divulgado:
 *
 * 1. A taxa é MENOR. Medido na conta de produção em 2026-08-12, com R$25, R$45,
 *    R$150, R$180 e R$1.000: o transparente cobra R$0,80 fixos e o hospedado
 *    cobra R$1,00 fixos, em qualquer valor. A diferença é por endpoint, não por
 *    negociação.
 * 2. O transparente devolve `brCode` e `brCodeBase64`, então o QR aparece na
 *    nossa própria tela e o comprador nunca sai da página.
 * 3. O hospedado exige criar PRODUTO no catálogo deles antes. O transparente
 *    recebe o valor direto em centavos, o que combina com `ticket_types` sendo
 *    a nossa fonte de preço.
 *
 * Três armadilhas do contrato, todas verificadas contra a API real e cobertas
 * por teste aqui do lado:
 *
 * - O discriminador `method` fica no TOPO do corpo, fora de `data`. Sem ele a
 *   API responde `Value should be one of 'object', 'object'`, que não ajuda
 *   ninguém a descobrir o que faltou.
 * - Valores são CENTAVOS inteiros na ida e na volta, incluindo `platformFee`.
 *   Nada de dividir por 100, ao contrário do Asaas, que recebe reais.
 * - Erro vem com HTTP fora da faixa 2xx E com `success: false` no corpo. Os
 *   dois são checados: confiar só no status deixaria passar um 200 com
 *   `success: false` se eles mudarem de ideia.
 */

type Fetch = typeof fetch;

function config() {
  return resolveAbacateConfig({ ABACATE_API_KEY: process.env.ABACATE_API_KEY });
}

/** Envelope padrão de toda resposta da v2. */
type Envelope<T> = { success: boolean; data: T | null; error: string | null };

function describeError(raw: string, status: number, path: string): string {
  let msg = raw;
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope<unknown>>;
    if (typeof parsed.error === "string" && parsed.error) msg = parsed.error;
  } catch {
    /* mantém raw */
  }
  return `AbacatePay ${path} falhou (${status}): ${msg}`;
}

async function unwrap<T>(res: Response, path: string): Promise<T> {
  const raw = await res.text();
  if (!res.ok) throw new Error(describeError(raw, res.status, path));

  let parsed: Envelope<T>;
  try {
    parsed = JSON.parse(raw) as Envelope<T>;
  } catch {
    throw new Error(`AbacatePay ${path} devolveu corpo não-JSON (${res.status}).`);
  }
  // 2xx com success:false. Hoje não acontece, mas tratar como sucesso aqui
  // significaria devolver `data: null` para o caller como se fosse cobrança.
  if (!parsed.success || parsed.data == null) {
    throw new Error(describeError(raw, res.status, path));
  }
  return parsed.data;
}

async function post<T>(path: string, body: unknown, fetchImpl: Fetch): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetchWithTimeout(fetchImpl, `${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  return unwrap<T>(res, path);
}

async function get<T>(path: string, fetchImpl: Fetch): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetchWithTimeout(fetchImpl, `${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return unwrap<T>(res, path);
}

export type AbacateCustomer = {
  name: string;
  email: string;
  /** CPF ou CNPJ. Aceita com ou sem máscara. */
  taxId: string;
  cellphone: string;
};

export type PixChargeInput = {
  /** Valor em centavos inteiros. Nunca reais. */
  amountCents: number;
  description: string;
  /** Validade do QR, em segundos. */
  expiresInSeconds: number;
  customer?: AbacateCustomer;
  /** Vai e volta intacto. É onde o nosso ticketId viaja. */
  metadata?: Record<string, string>;
};

/**
 * Corpo do POST /transparents/create. Puro e testável, igual ao
 * `buildPaymentBody` do Asaas.
 *
 * O `method` no topo é o discriminador entre PIX e BOLETO, e é justamente o
 * campo que a doc esconde no meio do exemplo.
 */
export function buildPixChargeBody(input: PixChargeInput) {
  return {
    method: "PIX" as const,
    data: {
      amount: input.amountCents,
      description: input.description,
      expiresIn: input.expiresInSeconds,
      ...(input.customer ? { customer: input.customer } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  };
}

export type AbacatePixCharge = {
  id: string;
  /** Centavos, igual ao que foi pedido. */
  amountCents: number;
  /** Taxa da AbacatePay, em centavos. R$0,80 fixos no transparente. */
  platformFeeCents: number;
  /** Copia e cola. */
  brCode: string;
  /** PNG do QR já como data URI, pronto pro <img src>. */
  brCodeBase64: string;
  status: string;
  expiresAt: string | null;
  /** true = cobrança de teste, dinheiro não é real. */
  devMode: boolean;
};

type PixChargeResponse = {
  id: string;
  amount: number;
  status: string;
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  platformFee: number;
  expiresAt: string | null;
};

export async function createAbacatePixCharge(
  input: PixChargeInput,
  fetchImpl: Fetch = fetch,
): Promise<AbacatePixCharge> {
  const d = await post<PixChargeResponse>(
    "/transparents/create",
    buildPixChargeBody(input),
    fetchImpl,
  );
  return {
    id: d.id,
    amountCents: d.amount,
    platformFeeCents: d.platformFee,
    brCode: d.brCode,
    brCodeBase64: d.brCodeBase64,
    status: d.status,
    expiresAt: d.expiresAt ?? null,
    devMode: d.devMode,
  };
}

export type AbacatePixStatus = {
  id: string;
  status: string;
  expiresAt: string | null;
};

/**
 * Status de uma cobrança Pix. É o `verifyPaymentPaid` desta integração: o
 * webhook nunca é a única palavra sobre dinheiro.
 *
 * ATENÇÃO: o `/transparents/check` devolve id, status e validade, e NÃO devolve
 * o valor. Então a conferência de valor divergente (invariante I2) não pode ser
 * feita por aqui. Ela é feita comparando o `amount_cents` do nosso ticket com o
 * valor que criamos a cobrança, e o risco é baixo porque o QR do Pix é de valor
 * fixo: o pagador não tem onde digitar outro número.
 */
export async function getAbacatePixStatus(
  chargeId: string,
  fetchImpl: Fetch = fetch,
): Promise<AbacatePixStatus> {
  const d = await get<{ id: string; status: string; expiresAt?: string | null }>(
    `/transparents/check?id=${encodeURIComponent(chargeId)}`,
    fetchImpl,
  );
  return { id: d.id, status: d.status, expiresAt: d.expiresAt ?? null };
}

/**
 * Único status que significa dinheiro na conta. Lista fechada de propósito:
 * qualquer status novo que eles inventem cai como NÃO pago, que é o lado
 * seguro de errar.
 */
export function isAbacatePaidStatus(status: string): boolean {
  return status === "PAID";
}
