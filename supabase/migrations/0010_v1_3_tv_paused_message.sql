-- =========================================================================
-- V1.3: events.tv_paused_message
-- =========================================================================
-- Mensagem que cobre a TV em modo "pausa geral" (intervalo). NULL = normal,
-- texto não-vazio = TV exibe overlay fullscreen com logo + mensagem.
--
-- Realtime já está em events (subscription da TV escuta UPDATE de events),
-- então o overlay aparece/some sem polling.

alter table public.events
  add column if not exists tv_paused_message text;
