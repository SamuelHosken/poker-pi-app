import { resolveAsaasConfig } from "./asaas-config";

type Fetch = typeof fetch;

function config() {
  return resolveAsaasConfig({
    ASAAS_ENV: process.env.ASAAS_ENV,
    ASAAS_API_KEY_SANDBOX: process.env.ASAAS_API_KEY_SANDBOX,
    ASAAS_API_KEY_PRODUCTION: process.env.ASAAS_API_KEY_PRODUCTION,
  });
}

async function asaasPost<T>(path: string, body: unknown, fetchImpl: Fetch): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetchImpl(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { errors?: { description?: string }[] };
      msg = parsed.errors?.map((e) => e.description).join("; ") || raw;
    } catch {
      /* mantém raw */
    }
    throw new Error(`Asaas ${path} falhou (${res.status}): ${msg}`);
  }
  return (await res.json()) as T;
}

async function asaasGet<T>(path: string, fetchImpl: Fetch): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetchImpl(`${baseUrl}${path}`, { headers: { access_token: apiKey } });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Asaas ${path} falhou (${res.status}): ${raw}`);
  }
  return (await res.json()) as T;
}

/** Status + valor atual de uma cobranca (pra reconciliar cobrancas pendentes). */
export async function getAsaasPaymentStatus(
  paymentId: string,
  fetchImpl: Fetch = fetch,
): Promise<{ status: string; value: number; billingType?: string }> {
  const d = await asaasGet<{ status: string; value: number; billingType?: string }>(
    `/payments/${paymentId}`,
    fetchImpl,
  );
  return { status: d.status, value: d.value, billingType: d.billingType };
}

export type CheckoutInput = {
  ticketId: string; // vira externalReference (liga o pagamento ao pedido)
  valueCents: number;
  itemName: string;
  customer: { name: string; email: string; phone: string; cpf: string };
  successUrl: string;
  maxInstallments: number;
};

/**
 * Corpo do POST /checkouts. Pura e testavel. billingTypes CREDIT_CARD + PIX e
 * chargeTypes DETACHED + INSTALLMENT => o comprador escolhe PIX/a vista OU
 * cartao parcelado ate maxInstallments.
 */
export function buildCheckoutBody(input: CheckoutInput) {
  const value = input.valueCents / 100;
  return {
    billingTypes: ["CREDIT_CARD", "PIX"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    minutesToExpire: 60,
    externalReference: input.ticketId,
    callback: { successUrl: input.successUrl },
    items: [{ name: input.itemName, quantity: 1, value }],
    customerData: {
      name: input.customer.name,
      cpfCnpj: input.customer.cpf,
      email: input.customer.email,
      phone: input.customer.phone,
    },
    installment: { maxInstallmentCount: input.maxInstallments },
  };
}

/** Cria um Checkout no Asaas e devolve o id + a URL pra redirecionar o comprador. */
export async function createAsaasCheckout(
  input: CheckoutInput,
  fetchImpl: Fetch = fetch,
): Promise<{ id: string; url: string }> {
  const data = await asaasPost<{ id: string; link?: string }>(
    "/checkouts",
    buildCheckoutBody(input),
    fetchImpl,
  );
  const url = data.link ?? `https://asaas.com/checkoutSession/show?id=${data.id}`;
  return { id: data.id, url };
}

export async function createAsaasCustomer(
  input: { name: string; email: string; phone: string; cpf: string },
  fetchImpl: Fetch = fetch,
): Promise<{ id: string }> {
  const data = await asaasPost<{ id: string }>(
    "/customers",
    {
      name: input.name,
      email: input.email,
      mobilePhone: input.phone,
      cpfCnpj: input.cpf,
    },
    fetchImpl,
  );
  return { id: data.id };
}

export async function createAsaasPayment(
  input: {
    customerId: string;
    valueCents: number;
    description: string;
    externalReference: string;
    dueDate: string;
    maxInstallments?: number;
  },
  fetchImpl: Fetch = fetch,
): Promise<{ id: string; invoiceUrl: string }> {
  const data = await asaasPost<{ id: string; invoiceUrl: string }>(
    "/payments",
    {
      customer: input.customerId,
      billingType: "UNDEFINED",
      value: input.valueCents / 100,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
      ...(input.maxInstallments && input.maxInstallments > 1
        ? { maxInstallmentCount: input.maxInstallments }
        : {}),
    },
    fetchImpl,
  );
  return { id: data.id, invoiceUrl: data.invoiceUrl };
}
