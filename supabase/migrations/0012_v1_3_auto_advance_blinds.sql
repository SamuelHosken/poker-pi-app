-- =========================================================================
-- V1.3: events.auto_advance_blinds
-- =========================================================================
-- Liga/desliga avanço automático de nível quando o cronômetro expira.
-- Off (default) = admin avança manualmente, cronômetro pode ficar negativo.
-- On = página do admin (/admin/events/[id]/tv) detecta expiração e chama
-- advanceLevel automaticamente após 2s de carência.
--
-- NOTA: o trigger é client-side (precisa da página do admin aberta). Se o
-- admin fecha a página, sem auto-advance. Não há cron — V1.1 removeu.

alter table public.events
  add column if not exists auto_advance_blinds boolean not null default false;
