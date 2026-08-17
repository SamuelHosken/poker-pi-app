/**
 * Config da AbacatePay. Pura e testável, igual à do Asaas.
 *
 * Diferença importante em relação ao Asaas: aqui NÃO existem duas URLs base. O
 * mesmo host serve teste e produção, e quem decide o ambiente é o PREFIXO DA
 * CHAVE (`abc_dev_` ou `abc_prod_`). Isso é bom (uma variável a menos) e
 * perigoso (trocar a chave troca o ambiente em silêncio, sem nenhum outro
 * sinal), então o prefixo é validado aqui e exposto em `devMode`.
 */

export type AbacateEnvVars = {
  ABACATE_API_KEY?: string;
};

/** Host único: dev e produção saem da mesma URL, o ambiente vem da chave. */
export const ABACATE_BASE_URL = "https://api.abacatepay.com/v2";

const DEV_PREFIX = "abc_dev_";
const PROD_PREFIX = "abc_prod_";

export type AbacateConfig = {
  baseUrl: string;
  apiKey: string;
  /** true quando a chave é de teste. Nesse modo o dinheiro não é real. */
  devMode: boolean;
};

export function resolveAbacateConfig(env: AbacateEnvVars): AbacateConfig {
  const apiKey = env.ABACATE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Chave AbacatePay ausente: defina ABACATE_API_KEY.");
  }

  const isDev = apiKey.startsWith(DEV_PREFIX);
  const isProd = apiKey.startsWith(PROD_PREFIX);

  // Prefixo desconhecido lança de propósito. Sem isso, uma chave colada errada
  // (ou de uma versão futura da API) faria o código seguir sem saber se está
  // prestes a cobrar dinheiro de verdade, que é a única pergunta que importa
  // neste arquivo.
  if (!isDev && !isProd) {
    throw new Error(
      `Chave AbacatePay com prefixo desconhecido. Esperado "${DEV_PREFIX}" ou "${PROD_PREFIX}".`,
    );
  }

  return { baseUrl: ABACATE_BASE_URL, apiKey, devMode: isDev };
}
