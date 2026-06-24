export type AsaasEnvVars = {
  ASAAS_ENV?: string;
  ASAAS_API_KEY_SANDBOX?: string;
  ASAAS_API_KEY_PRODUCTION?: string;
};

const SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

/** Resolve URL base + chave de API a partir das env vars. Pura e testável. */
export function resolveAsaasConfig(env: AsaasEnvVars): {
  baseUrl: string;
  apiKey: string;
} {
  const isProd = env.ASAAS_ENV === "production";
  const baseUrl = isProd ? PRODUCTION_URL : SANDBOX_URL;
  const apiKey = isProd ? env.ASAAS_API_KEY_PRODUCTION : env.ASAAS_API_KEY_SANDBOX;
  if (!apiKey) {
    throw new Error(
      `Chave Asaas ausente para ambiente "${isProd ? "production" : "sandbox"}".`,
    );
  }
  return { baseUrl, apiKey };
}
