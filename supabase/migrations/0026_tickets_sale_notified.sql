-- Marca quando o push "Ingresso vendido" (admin) ja foi disparado pra um ticket.
--
-- O Asaas manda PAYMENT_CONFIRMED e PAYMENT_RECEIVED pro mesmo pagamento (e
-- re-tenta em qualquer resposta nao-2xx). O poker-pi-v2 notifica os admins da
-- venda em cada entrega; o tag de device colapsa no aparelho, mas o envio se
-- repete. Esta coluna permite um guard atomico (update ... where
-- sale_notified_at is null) pra disparar exatamente 1x por ingresso.
--
-- Tabela `tickets` e compartilhada entre poker-pi-app e poker-pi-v2 (mesmo
-- Supabase); a coluna e lida/escrita pelos dois.

alter table public.tickets
  add column if not exists sale_notified_at timestamptz;
