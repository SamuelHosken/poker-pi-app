-- Permite o status 'refunded' em tickets.
--
-- O webhook de estorno/chargeback (PAYMENT_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED,
-- PAYMENT_DELETED) marca o ticket como 'refunded' pra liberar a vaga. O CHECK
-- original (0020_tickets.sql) so aceitava pending/paid/canceled, entao o UPDATE
-- falhava calado e a vaga nunca era liberada. Aqui incluimos 'refunded'.

alter table public.tickets
  drop constraint if exists tickets_status_check;

alter table public.tickets
  add constraint tickets_status_check
  check (status in ('pending', 'paid', 'canceled', 'refunded'));
