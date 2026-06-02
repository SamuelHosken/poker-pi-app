-- =========================================================================
-- V1.3: notas de avaliação opcionais (permite "desconsiderar" uma categoria)
-- =========================================================================
-- Pra poder descartar uma nota específica de uma resposta (ex.: um jantar
-- avaliado como outlier) sem apagar a resposta inteira, as 5 notas viram
-- nullable. O cálculo de média ignora nulos. Os CHECKs (0..10) seguem valendo
-- quando a nota não é nula.

alter table public.event_feedback
  alter column rating_organizacao drop not null,
  alter column rating_torneio     drop not null,
  alter column rating_jantar      drop not null,
  alter column rating_bar         drop not null,
  alter column rating_estrutura   drop not null;
