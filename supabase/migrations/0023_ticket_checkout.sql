-- =========================================================================
-- Checkout do Asaas na venda de ingresso (parcelamento)
-- =========================================================================
-- A compra passa a criar um Checkout do Asaas (o comprador escolhe PIX/à vista
-- ou cartão parcelado até 12x) em vez de uma cobrança avulsa. O webhook
-- CHECKOUT_PAID confirma o ticket casando por este id. Coluna nullable e
-- aditiva: os tickets antigos (fluxo /payments) seguem funcionando por
-- asaas_payment_id.
-- =========================================================================

alter table public.tickets
  add column if not exists asaas_checkout_id text;

create unique index if not exists uq_tickets_asaas_checkout
  on public.tickets (asaas_checkout_id) where asaas_checkout_id is not null;
