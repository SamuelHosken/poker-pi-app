-- =========================================================================
-- V1.3: REPLICA IDENTITY FULL em participations
-- =========================================================================
-- Sem REPLICA IDENTITY FULL, Postgres logical replication (e por extensão
-- Supabase Realtime) só emite a PRIMARY KEY em eventos DELETE. Isso quebra:
--   - filtros do realtime baseados em outros campos (ex.: filter=match_id=eq.X)
--     nunca casam porque match_id não tá no payload do DELETE.
--   - reconciliação client-side que precisa saber a qual mesa pertencia o row.
--
-- Custo de FULL: cada DELETE/UPDATE carrega o row inteiro pelo replication
-- log. Tabela pequena (poucas participations por evento) — overhead irrelevante.

alter table public.participations replica identity full;
