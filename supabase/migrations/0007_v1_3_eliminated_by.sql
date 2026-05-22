-- =========================================================================
-- V1.3: eliminated_by em participations — rastreia rivalidades
-- =========================================================================
-- Quando um jogador é eliminado, opcionalmente registramos QUEM eliminou ele.
-- Permite stats tipo "Você eliminou X pessoas", "Maior rival: João (3×)".
--
-- Nullable porque eliminação pode ser sem causa nomeada (admin elimina
-- direto, player desiste sem indicar, etc).
--
-- ON DELETE SET NULL: se o "eliminador" for apagado depois, não sumimos
-- com o registro de eliminação — só zeramos a FK.

alter table public.participations
  add column eliminated_by_player_id uuid references public.players(id) on delete set null;

-- Index pra queries "quem mais eliminou", "fui eliminado por quem"
create index idx_participations_eliminated_by
  on public.participations(eliminated_by_player_id)
  where eliminated_by_player_id is not null;
