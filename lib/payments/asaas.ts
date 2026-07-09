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
