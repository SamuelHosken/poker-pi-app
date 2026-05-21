"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { logAction } from "@/lib/tournament/action-log";
import type { Tables } from "@/lib/types/database.types";
import type { PlayerState } from "@/lib/types/domain";

type Player = Tables<"players">;

export type RebuyEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export type EliminatedWithStatus = {
  player: Player;
  eligibility: RebuyEligibility;
  lastLevelNumber: number | null;
};

/**
 * Avalia se um jogador pode fazer rebuy.
 * Regras (todas obrigatórias):
 *   1. Evento tem rebuy ativo (rebuy_cents NOT NULL)
 *   2. player.state === 'ELIMINADO'
 *   3. player.rebuys_used < event.rebuy_limit_per_player
 *   4. Última partida do jogador ainda está em nível <= event.rebuy_until_level
 */
export async function isPlayerEligibleForRebuy(
  playerId: string,
): Promise<RebuyEligibility> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (pErr) throw new Error(`Erro ao ler jogador: ${pErr.message}`);
  if (!player) return { eligible: false, reason: "Jogador não encontrado." };

  if (player.state !== "ELIMINADO") {
    return { eligible: false, reason: "Jogador não está eliminado." };
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("rebuy_cents, rebuy_limit_per_player, rebuy_until_level")
    .eq("id", player.event_id)
    .maybeSingle();
  if (eErr) throw new Error(`Erro ao ler evento: ${eErr.message}`);
  if (!event) return { eligible: false, reason: "Evento não encontrado." };

  if (event.rebuy_cents == null) {
    return { eligible: false, reason: "Rebuy não configurado neste evento." };
  }
  if (player.rebuys_used >= event.rebuy_limit_per_player) {
    return {
      eligible: false,
      reason: `Limite de rebuys atingido (${player.rebuys_used}/${event.rebuy_limit_per_player}).`,
    };
  }

  // Última participação eliminada → match.current_level_id → blind_level.level_number
  const { data: parts } = await supabase
    .from("participations")
    .select("eliminated_at, match_id")
    .eq("player_id", playerId)
    .not("eliminated_at", "is", null)
    .order("eliminated_at", { ascending: false })
    .limit(1);

  const lastPart = parts?.[0];
  if (!lastPart) {
    return { eligible: false, reason: "Sem participação anterior registrada." };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("current_level_id")
    .eq("id", lastPart.match_id)
    .maybeSingle();
  if (!match?.current_level_id) {
    return { eligible: false, reason: "Mesa anterior sem nível atual." };
  }

  const { data: level } = await supabase
    .from("blind_levels")
    .select("level_number")
    .eq("id", match.current_level_id)
    .maybeSingle();
  if (!level) return { eligible: false, reason: "Nível não encontrado." };

  if (level.level_number > event.rebuy_until_level) {
    return {
      eligible: false,
      reason: `Janela de rebuy fechou (nível atual ${level.level_number} > ${event.rebuy_until_level}).`,
    };
  }

  return { eligible: true };
}

/**
 * Lista todos os ELIMINADOS do evento, cada um com seu status de elegibilidade
 * pra rebuy. Faz consultas em lote pra evitar N+1.
 */
export async function getEliminatedWithRebuyStatus(
  eventId: string,
): Promise<EliminatedWithStatus[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: event, error: eErr }, { data: eliminated, error: plErr }] = await Promise.all([
    supabase
      .from("events")
      .select("rebuy_cents, rebuy_limit_per_player, rebuy_until_level")
      .eq("id", eventId)
      .single(),
    supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .eq("state", "ELIMINADO")
      .order("updated_at", { ascending: false }),
  ]);
  if (eErr) throw new Error(`Erro ao ler evento: ${eErr.message}`);
  if (plErr) throw new Error(`Erro ao listar eliminados: ${plErr.message}`);

  const players = eliminated ?? [];
  if (players.length === 0) return [];

  const playerIds = players.map((p) => p.id);

  const [{ data: parts }, { data: levels }] = await Promise.all([
    supabase
      .from("participations")
      .select("player_id, match_id, eliminated_at")
      .in("player_id", playerIds)
      .not("eliminated_at", "is", null)
      .order("eliminated_at", { ascending: false }),
    supabase.from("blind_levels").select("id, level_number").eq("event_id", eventId),
  ]);

  // Mapa player_id → última participation eliminada
  const lastPartByPlayer = new Map<string, { match_id: string }>();
  for (const p of parts ?? []) {
    if (!lastPartByPlayer.has(p.player_id)) {
      lastPartByPlayer.set(p.player_id, { match_id: p.match_id });
    }
  }

  // Busca matches em batch
  const matchIds = Array.from(new Set([...lastPartByPlayer.values()].map((v) => v.match_id)));
  const matchesById = new Map<string, { current_level_id: string | null }>();
  if (matchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, current_level_id")
      .in("id", matchIds);
    for (const m of matches ?? []) {
      matchesById.set(m.id, { current_level_id: m.current_level_id });
    }
  }

  const levelsById = new Map<string, number>();
  for (const lvl of levels ?? []) levelsById.set(lvl.id, lvl.level_number);

  return players.map<EliminatedWithStatus>((player) => {
    let lastLevelNumber: number | null = null;
    let eligibility: RebuyEligibility;

    if (!event || event.rebuy_cents == null) {
      eligibility = { eligible: false, reason: "Rebuy não configurado neste evento." };
    } else if (player.rebuys_used >= event.rebuy_limit_per_player) {
      eligibility = {
        eligible: false,
        reason: `Limite de rebuys (${player.rebuys_used}/${event.rebuy_limit_per_player}).`,
      };
    } else {
      const lastPart = lastPartByPlayer.get(player.id);
      const lvlId = lastPart && matchesById.get(lastPart.match_id)?.current_level_id;
      lastLevelNumber = lvlId ? (levelsById.get(lvlId) ?? null) : null;

      if (lastLevelNumber == null) {
        eligibility = { eligible: false, reason: "Sem nível atual registrado." };
      } else if (lastLevelNumber > event.rebuy_until_level) {
        eligibility = {
          eligible: false,
          reason: `Janela fechou (nível ${lastLevelNumber} > ${event.rebuy_until_level}).`,
        };
      } else {
        eligibility = { eligible: true };
      }
    }

    return { player, eligibility, lastLevelNumber };
  });
}

/**
 * Executa rebuy: jogador volta pra fila (PRESENTE), incrementa rebuys_used,
 * registra no action_log.
 */
export async function performRebuy(playerId: string): Promise<void> {
  await requireAdmin();
  const eligibility = await isPlayerEligibleForRebuy(playerId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (pErr) throw new Error(`Erro ao ler jogador: ${pErr.message}`);
  if (!player) throw new Error("Jogador não encontrado.");

  const { error: updErr } = await supabase
    .from("players")
    .update({
      state: "PRESENTE",
      rebuys_used: player.rebuys_used + 1,
    })
    .eq("id", playerId);
  if (updErr) throw new Error(`Erro ao atualizar jogador: ${updErr.message}`);

  await logAction(supabase, player.event_id, {
    type: "REBUY_PLAYER",
    playerId,
    previousState: {
      playerState: player.state as PlayerState,
      rebuysUsed: player.rebuys_used,
    },
  });

  revalidatePath(`/admin/events/${player.event_id}`);
  revalidatePath(`/tv/${player.event_id}`);
}
