"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { canTransitionMatch, transitionErrorMessage } from "@/lib/tournament/transitions";
import {
  logAction,
  getLastReversibleAction,
  markActionReverted,
  type ActionPayload,
} from "@/lib/tournament/action-log";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";
import type { MatchState, PlayerState } from "@/lib/types/domain";

type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;
type Participation = Tables<"participations">;
type Player = Tables<"players">;

/**
 * Embaralha um array (Fisher-Yates), retorna nova cópia.
 * Usa Math.random() — bom o bastante para sorteio entre amigos.
 */
function shuffle<T>(arr: ReadonlyArray<T>): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * Inicia uma nova partida na mesa física com os jogadores selecionados.
 */
export async function startMatchOnTable(input: {
  physicalTableId: string;
  playerIds: string[];
  randomizeSeats?: boolean;
}): Promise<{ matchId: string }> {
  const { physicalTableId, playerIds, randomizeSeats = true } = input;
  if (playerIds.length < 2) {
    throw new Error("Uma partida precisa de pelo menos 2 jogadores.");
  }
  await requireAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: table, error: tableErr } = await supabase
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();

  if (tableErr) throw new Error(`Erro ao buscar mesa: ${tableErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");
  // Aceita LIVRE (primeira partida) ou FINALIZADA (renovação após mesa terminar).
  if (table.state !== "LIVRE" && table.state !== "FINALIZADA") {
    throw new Error(
      `Mesa não pode iniciar partida no estado atual (${table.state}). Aguarde finalizar.`,
    );
  }
  const previousTableState = table.state as "LIVRE" | "FINALIZADA";

  const { data: firstLevel, error: levelErr } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("event_id", table.event_id)
    .eq("is_final_table", false)
    .order("level_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (levelErr) throw new Error(`Erro ao buscar nível inicial: ${levelErr.message}`);
  if (!firstLevel) throw new Error("Evento não tem estrutura de blinds configurada.");

  const { data: lastMatch } = await supabase
    .from("matches")
    .select("match_number")
    .eq("event_id", table.event_id)
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const matchNumber = (lastMatch?.match_number ?? 0) + 1;
  const startedAt = new Date().toISOString();

  const matchInsert: Inserts<"matches"> = {
    event_id: table.event_id,
    physical_table_id: physicalTableId,
    match_number: matchNumber,
    is_final_table: false,
    state: "JOGANDO",
    current_level_id: firstLevel.id,
    level_started_at: startedAt,
    started_at: startedAt,
    total_paused_ms: 0,
  };

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert(matchInsert)
    .select()
    .single();

  if (matchErr || !match) {
    throw new Error(`Erro ao criar partida: ${matchErr?.message ?? "desconhecido"}`);
  }

  const seats = randomizeSeats ? shuffle(playerIds) : playerIds.slice();
  const participations: Inserts<"participations">[] = seats.map((playerId, idx) => ({
    match_id: match.id,
    player_id: playerId,
    seat_number: idx + 1,
  }));

  const { error: partErr } = await supabase.from("participations").insert(participations);
  if (partErr) {
    await supabase.from("matches").delete().eq("id", match.id);
    throw new Error(`Erro ao registrar participações: ${partErr.message}`);
  }

  const { error: playerErr } = await supabase
    .from("players")
    .update({ state: "JOGANDO" })
    .in("id", playerIds);
  if (playerErr) throw new Error(`Erro ao atualizar jogadores: ${playerErr.message}`);

  const { error: tblErr } = await supabase
    .from("physical_tables")
    .update({ state: "JOGANDO" })
    .eq("id", physicalTableId);
  if (tblErr) throw new Error(`Erro ao atualizar mesa: ${tblErr.message}`);

  await logAction(supabase, table.event_id, {
    type: "START_MATCH",
    matchId: match.id,
    physicalTableId,
    playerIds,
    previousState: { matchState: "LIVRE", tableState: previousTableState },
  });

  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/tv/${table.event_id}`);
  return { matchId: match.id };
}

async function loadMatch(matchId: string): Promise<Match> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar partida: ${error.message}`);
  if (!data) throw new Error("Partida não encontrada.");
  return data;
}

function ensureTransition(from: MatchState, to: MatchState) {
  if (!canTransitionMatch(from, to)) {
    throw new Error(transitionErrorMessage("partida", from, to));
  }
}

export async function pauseMatch(matchId: string): Promise<void> {
  await requireAdmin();
  const match = await loadMatch(matchId);
  ensureTransition(match.state as MatchState, "PAUSADA");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("matches")
    .update({ state: "PAUSADA", paused_at: now })
    .eq("id", matchId);
  if (error) throw new Error(`Erro ao pausar partida: ${error.message}`);

  await supabase
    .from("physical_tables")
    .update({ state: "PAUSADA" })
    .eq("id", match.physical_table_id);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
}

export async function resumeMatch(matchId: string): Promise<void> {
  await requireAdmin();
  const match = await loadMatch(matchId);
  ensureTransition(match.state as MatchState, "JOGANDO");
  if (!match.paused_at) {
    throw new Error("Partida não tem paused_at registrado — estado inconsistente.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const pauseElapsedMs = Date.now() - new Date(match.paused_at).getTime();
  const newTotalPaused = Number(match.total_paused_ms ?? 0) + Math.max(0, pauseElapsedMs);

  const { error } = await supabase
    .from("matches")
    .update({
      state: "JOGANDO",
      paused_at: null,
      total_paused_ms: newTotalPaused,
    })
    .eq("id", matchId);
  if (error) throw new Error(`Erro ao retomar partida: ${error.message}`);

  await supabase
    .from("physical_tables")
    .update({ state: "JOGANDO" })
    .eq("id", match.physical_table_id);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
}

export async function advanceLevel(matchId: string): Promise<{ advanced: boolean }> {
  await requireAdmin();
  const match = await loadMatch(matchId);
  if (match.state === "FINALIZADA") {
    throw new Error("Partida finalizada não avança nível.");
  }
  if (!match.current_level_id) {
    throw new Error("Partida sem nível atual configurado.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: currentLevel, error: curErr } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("id", match.current_level_id)
    .maybeSingle();
  if (curErr) throw new Error(`Erro ao ler nível atual: ${curErr.message}`);
  if (!currentLevel) throw new Error("Nível atual não encontrado.");

  const { data: nextLevel, error: nextErr } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("event_id", match.event_id)
    .eq("is_final_table", currentLevel.is_final_table)
    .gt("level_number", currentLevel.level_number)
    .order("level_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextErr) throw new Error(`Erro ao buscar próximo nível: ${nextErr.message}`);

  if (!nextLevel) {
    return { advanced: false };
  }

  const { error: updErr } = await supabase
    .from("matches")
    .update({
      current_level_id: nextLevel.id,
      level_started_at: new Date().toISOString(),
      total_paused_ms: 0,
      paused_at: null,
    })
    .eq("id", matchId);

  if (updErr) throw new Error(`Erro ao avançar nível: ${updErr.message}`);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
  return { advanced: true };
}

/**
 * Elimina um jogador da partida.
 *
 * final_position é calculado como o número de jogadores ainda na mesa
 * (incluindo o que está saindo). Ex.: mesa de 8, primeiro eliminado fica
 * em posição 8; quando resta só 1 não-eliminado, esse é o vencedor (1º).
 */
export async function eliminatePlayer(input: {
  matchId: string;
  playerId: string;
}): Promise<{ finalPosition: number }> {
  const { matchId, playerId } = input;
  await requireAdmin();
  const match = await loadMatch(matchId);

  if (match.state === "FINALIZADA") {
    throw new Error("Partida já finalizada — não dá pra eliminar mais.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: participation, error: partErr } = await supabase
    .from("participations")
    .select("*")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (partErr) throw new Error(`Erro ao buscar participação: ${partErr.message}`);
  if (!participation) throw new Error("Jogador não está nesta partida.");
  if (participation.eliminated_at) {
    throw new Error("Jogador já foi eliminado.");
  }

  // Posição final = quantos ainda estão na mesa (incluindo o que sai agora)
  const { count, error: cntErr } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("match_id", matchId)
    .is("eliminated_at", null);
  if (cntErr) throw new Error(`Erro ao contar restantes: ${cntErr.message}`);
  const finalPosition = count ?? 1;

  // Carrega estado anterior do player pra log
  const { data: player, error: plErr } = await supabase
    .from("players")
    .select("state, final_position")
    .eq("id", playerId)
    .maybeSingle();
  if (plErr) throw new Error(`Erro ao ler jogador: ${plErr.message}`);
  if (!player) throw new Error("Jogador não encontrado.");

  const now = new Date().toISOString();

  // Mapeia estado do player conforme o tipo de mesa
  let newPlayerState: PlayerState = "ELIMINADO";
  let newPlayerFinalPosition: number | null = player.final_position;
  if (match.is_final_table) {
    newPlayerFinalPosition = finalPosition;
    if (finalPosition === 2) newPlayerState = "VICE";
    else if (finalPosition === 3) newPlayerState = "TERCEIRO";
    else newPlayerState = "OUTROS_FINALISTAS";
  }

  const { error: updPartErr } = await supabase
    .from("participations")
    .update({ eliminated_at: now, final_position: finalPosition })
    .eq("id", participation.id);
  if (updPartErr) throw new Error(`Erro ao atualizar participação: ${updPartErr.message}`);

  const { error: updPlErr } = await supabase
    .from("players")
    .update({
      state: newPlayerState,
      final_position: newPlayerFinalPosition,
    })
    .eq("id", playerId);
  if (updPlErr) throw new Error(`Erro ao atualizar jogador: ${updPlErr.message}`);

  await logAction(supabase, match.event_id, {
    type: "ELIMINATE_PLAYER",
    matchId,
    playerId,
    participationId: participation.id,
    isFinalTable: match.is_final_table,
    previousState: {
      playerState: player.state as PlayerState,
      playerFinalPosition: player.final_position,
    },
  });

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
  return { finalPosition };
}

/**
 * Finaliza a partida. Só funciona quando resta exatamente 1 jogador não-eliminado
 * — esse vira o vencedor (CLASSIFICADO + final_position=1).
 */
export async function finishMatch(matchId: string): Promise<{ winnerPlayerId: string }> {
  await requireAdmin();
  const match = await loadMatch(matchId);

  if (match.state === "FINALIZADA") {
    throw new Error("Partida já está finalizada.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: remaining, error: remErr } = await supabase
    .from("participations")
    .select("*")
    .eq("match_id", matchId)
    .is("eliminated_at", null);

  if (remErr) throw new Error(`Erro ao buscar restantes: ${remErr.message}`);
  if (!remaining || remaining.length !== 1) {
    throw new Error(
      `Finalizar mesa só com 1 jogador restante (atual: ${remaining?.length ?? 0}).`,
    );
  }
  const winner = remaining[0]!;

  const { data: winnerPlayer, error: wpErr } = await supabase
    .from("players")
    .select("state, final_position")
    .eq("id", winner.player_id)
    .maybeSingle();
  if (wpErr) throw new Error(`Erro ao ler vencedor: ${wpErr.message}`);
  if (!winnerPlayer) throw new Error("Vencedor não encontrado.");

  const { data: physicalTable, error: ptErr } = await supabase
    .from("physical_tables")
    .select("state")
    .eq("id", match.physical_table_id)
    .maybeSingle();
  if (ptErr) throw new Error(`Erro ao ler mesa física: ${ptErr.message}`);
  if (!physicalTable) throw new Error("Mesa física não encontrada.");

  // Carrega event state pra log + decidir se vai pra ENCERRADO
  const { data: eventRow, error: evErr } = await supabase
    .from("events")
    .select("state")
    .eq("id", match.event_id)
    .maybeSingle();
  if (evErr) throw new Error(`Erro ao ler evento: ${evErr.message}`);
  if (!eventRow) throw new Error("Evento não encontrado.");

  const now = new Date().toISOString();
  const isFinal = match.is_final_table;

  // Estado e final_position do vencedor dependem do tipo de mesa
  const winnerNewState: PlayerState = isFinal ? "CAMPEAO" : "CLASSIFICADO";
  const winnerFinalPositionNew = isFinal ? 1 : winnerPlayer.final_position;

  const { error: updMatchErr } = await supabase
    .from("matches")
    .update({
      state: "FINALIZADA",
      winner_player_id: winner.player_id,
      finished_at: now,
    })
    .eq("id", matchId);
  if (updMatchErr) throw new Error(`Erro ao finalizar partida: ${updMatchErr.message}`);

  const { error: updWinPartErr } = await supabase
    .from("participations")
    .update({ final_position: 1 })
    .eq("id", winner.id);
  if (updWinPartErr) throw new Error(`Erro ao atualizar participação do vencedor: ${updWinPartErr.message}`);

  const { error: updWinPlErr } = await supabase
    .from("players")
    .update({ state: winnerNewState, final_position: winnerFinalPositionNew })
    .eq("id", winner.player_id);
  if (updWinPlErr) throw new Error(`Erro ao atualizar vencedor: ${updWinPlErr.message}`);

  const { error: updTblErr } = await supabase
    .from("physical_tables")
    .update({ state: "FINALIZADA" })
    .eq("id", match.physical_table_id);
  if (updTblErr) throw new Error(`Erro ao atualizar mesa: ${updTblErr.message}`);

  // Mesa final → evento vai pra ENCERRADO
  if (isFinal) {
    if (eventRow.state !== "MESA_FINAL") {
      throw new Error(
        `Evento esperava MESA_FINAL ao finalizar mesa final (atual: ${eventRow.state}).`,
      );
    }
    const { error: updEvErr } = await supabase
      .from("events")
      .update({ state: "ENCERRADO" })
      .eq("id", match.event_id);
    if (updEvErr) throw new Error(`Erro ao encerrar evento: ${updEvErr.message}`);
  }

  await logAction(supabase, match.event_id, {
    type: "FINISH_MATCH",
    matchId,
    winnerPlayerId: winner.player_id,
    winnerParticipationId: winner.id,
    physicalTableId: match.physical_table_id,
    isFinalTable: isFinal,
    previousState: {
      match: {
        state: match.state as MatchState,
        winner_player_id: match.winner_player_id,
        finished_at: match.finished_at,
      },
      winnerPlayerState: winnerPlayer.state as PlayerState,
      winnerFinalPosition: winner.final_position,
      physicalTableState: physicalTable.state as MatchState,
      ...(isFinal
        ? {
            eventState: "MESA_FINAL" as const,
            winnerPlayerFinalPosition: winnerPlayer.final_position,
          }
        : {}),
    },
  });

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
  return { winnerPlayerId: winner.player_id };
}

/**
 * Desfaz a última ação reversível do evento.
 *
 * Suporta: ELIMINATE_PLAYER, FINISH_MATCH, START_MATCH.
 * (REBUY_PLAYER e TRANSITION_TO_FINAL serão tratados nas Etapas 4 e 5.)
 */
export async function undoLastAction(eventId: string): Promise<{ undone: ActionPayload["type"] | null }> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const last = await getLastReversibleAction(supabase, eventId);
  if (!last) return { undone: null };

  const { row, payload } = last;

  switch (payload.type) {
    case "ELIMINATE_PLAYER": {
      await supabase
        .from("participations")
        .update({ eliminated_at: null, final_position: null })
        .eq("id", payload.participationId);
      await supabase
        .from("players")
        .update({
          state: payload.previousState.playerState,
          final_position: payload.previousState.playerFinalPosition,
        })
        .eq("id", payload.playerId);
      break;
    }
    case "FINISH_MATCH": {
      const prev = payload.previousState;
      await supabase
        .from("matches")
        .update({
          state: prev.match.state,
          winner_player_id: prev.match.winner_player_id,
          finished_at: prev.match.finished_at,
        })
        .eq("id", payload.matchId);
      await supabase
        .from("participations")
        .update({ final_position: prev.winnerFinalPosition })
        .eq("id", payload.winnerParticipationId);
      await supabase
        .from("players")
        .update({
          state: prev.winnerPlayerState,
          ...(payload.isFinalTable
            ? { final_position: prev.winnerPlayerFinalPosition ?? null }
            : {}),
        })
        .eq("id", payload.winnerPlayerId);
      await supabase
        .from("physical_tables")
        .update({ state: prev.physicalTableState })
        .eq("id", payload.physicalTableId);
      // Mesa final: restaurar event.state ENCERRADO → MESA_FINAL
      if (payload.isFinalTable && prev.eventState) {
        await supabase
          .from("events")
          .update({ state: prev.eventState })
          .eq("id", eventId);
      }
      break;
    }
    case "START_MATCH": {
      // Deletar match cascateia pra participations
      await supabase.from("matches").delete().eq("id", payload.matchId);
      await supabase
        .from("players")
        .update({ state: "PRESENTE" })
        .in("id", payload.playerIds);
      await supabase
        .from("physical_tables")
        .update({ state: payload.previousState.tableState })
        .eq("id", payload.physicalTableId);
      break;
    }
    case "REBUY_PLAYER": {
      await supabase
        .from("players")
        .update({
          state: payload.previousState.playerState,
          rebuys_used: payload.previousState.rebuysUsed,
        })
        .eq("id", payload.playerId);
      break;
    }
    case "ASSIGN_SEAT":
    case "TRANSITION_TO_FINAL": {
      throw new Error(`Desfazer ${payload.type} ainda não implementado nesta etapa.`);
    }
  }

  await markActionReverted(supabase, row.id);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/tv/${eventId}`);
  return { undone: payload.type };
}

/**
 * Libera uma mesa FINALIZADA — volta pro estado LIVRE sem iniciar nova partida.
 * Útil quando o organizador quer aguardar fila crescer antes de renovar.
 */
export async function releaseFinishedTable(physicalTableId: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: table, error: tErr } = await supabase
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();
  if (tErr) throw new Error(`Erro ao ler mesa: ${tErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");
  if (table.state !== "FINALIZADA") {
    throw new Error(`Só dá pra liberar mesa FINALIZADA (atual: ${table.state}).`);
  }

  const { error: updErr } = await supabase
    .from("physical_tables")
    .update({ state: "LIVRE" })
    .eq("id", physicalTableId);
  if (updErr) throw new Error(`Erro ao liberar mesa: ${updErr.message}`);

  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/tv/${table.event_id}`);
}

export async function getMatchesForEvent(eventId: string): Promise<{
  matches: Match[];
  levelsById: Record<string, BlindLevel>;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: matches }, { data: levels }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .order("match_number", { ascending: true }),
    supabase.from("blind_levels").select("*").eq("event_id", eventId),
  ]);

  const levelsById: Record<string, BlindLevel> = {};
  for (const lvl of levels ?? []) levelsById[lvl.id] = lvl;

  return { matches: matches ?? [], levelsById };
}

/**
 * Lista participations de uma partida com player anexado (via consulta separada).
 */
export async function getParticipationsForMatch(matchId: string): Promise<
  Array<Participation & { player: Pick<Player, "id" | "name" | "nickname" | "state"> }>
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: parts, error } = await supabase
    .from("participations")
    .select("*")
    .eq("match_id", matchId)
    .order("seat_number", { ascending: true });
  if (error) throw new Error(`Erro ao buscar participações: ${error.message}`);
  if (!parts || parts.length === 0) return [];

  const playerIds = parts.map((p) => p.player_id);
  const { data: players } = await supabase
    .from("players")
    .select("id, name, nickname, state")
    .in("id", playerIds);

  const playersById = new Map((players ?? []).map((p) => [p.id, p]));
  return parts.map((p) => ({
    ...p,
    player: playersById.get(p.player_id) ?? {
      id: p.player_id,
      name: "—",
      nickname: null,
      state: "INSCRITO",
    },
  }));
}

/**
 * Indica se ainda existem ações reversíveis no evento.
 */
export async function hasReversibleAction(eventId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count } = await supabase
    .from("action_log")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("reverted_at", null);
  return (count ?? 0) > 0;
}
