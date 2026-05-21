"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAction } from "@/lib/tournament/action-log";
import type { EventState, PlayerState } from "@/lib/types/domain";

/**
 * V1.1 — Detecta se sobrou apenas 1 jogador não-eliminado no evento.
 * Se sim, marca-o como CAMPEAO e encerra o evento.
 *
 * Idempotente: pode ser chamada várias vezes sem efeito colateral
 * (early-return se event.state !== EM_ANDAMENTO).
 *
 * Esta função NÃO chama `requireAdmin` porque é invocada DENTRO de outras
 * Server Actions já autenticadas (ex: eliminatePlayer). RLS protege a
 * autorização — se o caller não tiver permissão, o UPDATE falha.
 */
export async function detectChampionAndEndEvent(
  eventId: string,
): Promise<{ championDetected: boolean; championId: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id, state")
    .eq("id", eventId)
    .maybeSingle();
  if (eErr) throw new Error(`Erro ao ler evento: ${eErr.message}`);
  if (!event) throw new Error("Evento não encontrado.");

  if (event.state !== "EM_ANDAMENTO") {
    return { championDetected: false, championId: null };
  }

  // Conta jogadores ainda em JOGANDO
  const { data: activePlayers, error: apErr } = await supabase
    .from("players")
    .select("id, state, final_position")
    .eq("event_id", eventId)
    .eq("state", "JOGANDO");
  if (apErr) throw new Error(`Erro ao ler jogadores ativos: ${apErr.message}`);

  if (!activePlayers || activePlayers.length !== 1) {
    return { championDetected: false, championId: null };
  }

  const champion = activePlayers[0]!;

  // Marca campeão
  const { error: upPlErr } = await supabase
    .from("players")
    .update({ state: "CAMPEAO", final_position: 1 })
    .eq("id", champion.id);
  if (upPlErr) throw new Error(`Erro ao coroar campeão: ${upPlErr.message}`);

  // Encerra evento
  const { error: upEvErr } = await supabase
    .from("events")
    .update({ state: "ENCERRADO" })
    .eq("id", eventId);
  if (upEvErr) throw new Error(`Erro ao encerrar evento: ${upEvErr.message}`);

  await logAction(supabase, eventId, {
    type: "CHAMPION_DETECTED",
    eventId,
    championId: champion.id,
    previousChampionState: {
      state: champion.state as PlayerState,
      finalPosition: champion.final_position,
    },
    previousEventState: { state: event.state as EventState },
  });

  return { championDetected: true, championId: champion.id };
}
