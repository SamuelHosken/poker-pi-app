-- =========================================================================
-- V1.3 — `events.tv_starts_at`: horário-alvo do início do torneio.
-- =========================================================================
-- Quando setado, a TV mostra overlay especial "Vamos começar jajá — HH:MM"
-- com countdown ao vivo. Independente do `tv_paused_message` (que é pausa
-- mid-evento). Use pra esquentar os jogadores antes de começar.

alter table public.events
  add column if not exists tv_starts_at timestamptz;
