-- =========================================================================
-- Parcelamento com repasse de juros na venda de ingresso
-- =========================================================================
-- A LP passa a deixar o comprador escolher PIX (valor cheio) ou cartão
-- parcelado (com o juros do Asaas repassado). Guardamos o valor que o
-- comprador de fato pagou (charged_amount_cents, >= amount_cents no cartão) e
-- o número de parcelas. amount_cents continua sendo o preço base (o líquido
-- que você recebe). Colunas aditivas e nullable: tickets antigos seguem ok.
-- =========================================================================

alter table public.tickets
  add column if not exists charged_amount_cents int,
  add column if not exists installments        int;
