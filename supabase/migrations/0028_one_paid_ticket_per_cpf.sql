-- Invariante I1: no maximo 1 ingresso PAGO por CPF por evento.
--
-- A regra ja existe em codigo (lib/tickets/dedup.ts), mas codigo de aplicacao
-- nao segura corrida: duas confirmacoes simultaneas do mesmo CPF passam pelas
-- duas checagens antes de qualquer uma escrever. O indice parcial e a unica
-- garantia real.
--
-- Parcial de proposito: pending, canceled e refunded podem repetir a vontade.
-- So 'paid' e exclusivo.
create unique index if not exists uq_tickets_one_paid_per_cpf_event
  on public.tickets (event_id, buyer_cpf)
  where status = 'paid';
