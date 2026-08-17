/**
 * Quem cobra o Pix do ingresso.
 *
 * O interruptor de emergencia desta feature. Se a AbacatePay cair, se a taxa
 * mudar, ou se a conta for bloqueada, trocar UMA variavel de ambiente devolve o
 * Pix manual (chave estatica mais comprovante no WhatsApp mais confirmacao do
 * admin), sem reverter commit e sem deploy de codigo.
 *
 * O padrao e `manual` de proposito: um ambiente novo que suba sem a variavel
 * cai no fluxo que ja funcionava, e nao num gateway que ele talvez nem tenha
 * chave para falar. A regra da casa para env de pagamento e falhar para o lado
 * conhecido, nunca para o lado novo.
 */

export type PixProvider = "manual" | "abacate";

export type PixProviderEnv = {
  PIX_PROVIDER?: string;
};

export function resolvePixProvider(env: PixProviderEnv): PixProvider {
  return env.PIX_PROVIDER?.trim().toLowerCase() === "abacate" ? "abacate" : "manual";
}

/**
 * Validade do QR, em segundos.
 *
 * Trinta minutos: tempo de sobra para abrir o aplicativo do banco e pagar, e
 * curto o bastante para uma compra abandonada nao segurar nada. Nao segura
 * vaga: a capacidade so conta ingresso PAGO, entao uma cobranca aberta nao tira
 * a cadeira de ninguem enquanto nao vira dinheiro.
 */
export const PIX_EXPIRA_SEGUNDOS = 30 * 60;
