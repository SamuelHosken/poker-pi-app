-- Flag de dedup: marca quando a chave PIX de um pedido foi copiada (1 aviso por pedido).
-- Espelha o padrao de tickets.sale_notified_at (0026).

alter table public.tickets
  add column if not exists pix_copied_at timestamptz;
