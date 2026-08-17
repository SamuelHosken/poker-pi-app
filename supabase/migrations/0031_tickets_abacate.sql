-- Ingresso pago por Pix da AbacatePay, alem do Asaas.
--
-- Aditiva e reversivel: nenhuma coluna existente muda de tipo, nada fica NOT
-- NULL, e as linhas antigas continuam validas com os campos novos em null.
--
-- Contexto: ate aqui um ticket so podia nascer de uma cobranca do Asaas
-- (`asaas_payment_id`) ou de um PIX manual conferido na mao (sem id nenhum). O
-- Pix da AbacatePay e um terceiro caminho, e ele precisa do proprio id, porque
-- e por ele que o webhook encontra o ticket.

-- Qual gateway emitiu a cobranca. Null nas linhas antigas de proposito: elas
-- sao anteriores a existir mais de um, e adivinhar retroativamente seria
-- inventar dado. Quem le trata null como "Asaas ou manual", que e o que era.
alter table public.tickets
  add column if not exists provider text;

alter table public.tickets
  drop constraint if exists tickets_provider_check;

alter table public.tickets
  add constraint tickets_provider_check
  check (provider is null or provider in ('asaas', 'abacate', 'manual'));

-- Id da cobranca Pix na AbacatePay (`pix_char_...`).
alter table public.tickets
  add column if not exists abacate_charge_id text;

-- Espelha `uq_tickets_asaas_payment` (0020_tickets.sql). Parcial porque a
-- imensa maioria das linhas nao tem cobranca da AbacatePay, e um unique cheio
-- barraria a segunda linha com null em alguns bancos.
--
-- Isto NAO e conveniencia de busca, e garantia: sem ele, duas entregas do mesmo
-- webhook chegando junto poderiam casar com linhas diferentes, e o mesmo
-- dinheiro emitiria dois ingressos.
create unique index if not exists uq_tickets_abacate_charge
  on public.tickets (abacate_charge_id)
  where abacate_charge_id is not null;

-- Busca do webhook: encontrar o ticket pelo id da cobranca e o caminho quente
-- de toda confirmacao de pagamento.
create index if not exists idx_tickets_provider
  on public.tickets (provider)
  where provider is not null;
