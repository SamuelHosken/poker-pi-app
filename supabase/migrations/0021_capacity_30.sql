-- 2ª edição passa a ter 30 lugares (3 mesas de poker), não 35.
-- A LP usa capacity para a copy ("30 lugares") e para fechar as vendas ao lotar.
update public.events
set capacity = 30
where slug = 'poker-pi-11-07';
