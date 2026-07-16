/**
 * Cálculo do repasse de juros do cartão (gross-up). O comprador que parcela
 * paga a taxa do Asaas; você recebe o valor base líquido. PIX fica no valor
 * cheio (você absorve a taxa fixa, que é ~grátis pelo volume).
 *
 * Taxa CHEIA do cartão de crédito (cobrança online) do Asaas. Editável aqui se
 * as taxas mudarem. Uso a taxa cheia (não a promo) pra você nunca receber menos.
 */

export type PaymentMethod = "PIX" | "CREDIT_CARD";

export const MAX_INSTALLMENTS = 6;

/** Taxa fixa por transação no cartão (R$ 0,49). */
const CARD_FEE_FIXED_CENTS = 49;

/** Faixas de taxa percentual por número de parcelas (limite superior inclusivo). */
const CARD_FEE_TIERS: { upTo: number; percent: number }[] = [
  { upTo: 1, percent: 0.0299 }, // à vista
  { upTo: 6, percent: 0.0349 }, // 2 a 6 parcelas
];

/** Taxa percentual do Asaas para um número de parcelas (1..MAX). */
export function cardFeePercent(installments: number): number {
  if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS) {
    throw new Error(`Parcelas fora do intervalo 1..${MAX_INSTALLMENTS}: ${installments}`);
  }
  const tier = CARD_FEE_TIERS.find((t) => installments <= t.upTo);
  if (!tier) throw new Error(`Sem faixa de taxa para ${installments} parcelas`);
  return tier.percent;
}

/**
 * Valor total (centavos) a cobrar no cartão para você receber `baseCents`
 * líquido em `installments` parcelas. Arredonda pra cima => nunca recebe menos.
 */
export function grossUpCents(baseCents: number, installments: number): number {
  const p = cardFeePercent(installments);
  return Math.ceil((baseCents + CARD_FEE_FIXED_CENTS) / (1 - p));
}

export type InstallmentOption = {
  installments: number;
  totalCents: number; // total que o comprador paga
  perInstallmentCents: number; // valor exibido por parcela ("Nx de R$ X")
};

/** Opções de parcelamento no cartão (1..MAX) com total e valor por parcela. */
export function installmentOptions(baseCents: number): InstallmentOption[] {
  const opts: InstallmentOption[] = [];
  for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
    const totalCents = grossUpCents(baseCents, n);
    opts.push({
      installments: n,
      totalCents,
      perInstallmentCents: Math.round(totalCents / n),
    });
  }
  return opts;
}
