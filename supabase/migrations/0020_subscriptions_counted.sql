-- =========================================================================
-- "Não contabilizar" inscrições
-- =========================================================================
-- Às vezes alguém se inscreve mas não entra na conta do evento. Em vez de
-- apagar (perde o histórico/contato), marcamos counted=false: a pessoa some
-- dos números do painel e da planilha, mas continua na lista (pode ser
-- recontabilizada a qualquer momento).
-- =========================================================================

alter table public.subscriptions
  add column if not exists counted boolean not null default true;
