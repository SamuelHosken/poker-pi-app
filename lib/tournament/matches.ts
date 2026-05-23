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
import type { EventState, MatchState, PlayerState } from "@/lib/types/domain";

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
  // V1.1: mesas não renovam. Só aceita LIVRE.
  if (table.state !== "LIVRE") {
    throw new Error(
      `Esta mesa já foi usada. Em V1.1 mesas não renovam — mesa fica em ${table.state}.`,
    );
  }
  const previousTableState = "LIVRE" as const;

  const { data: firstLevel, error: levelErr } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("physical_table_id", physicalTableId)
    .eq("is_final_table", false)
    .order("level_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (levelErr) throw new Error(`Erro ao buscar nível inicial: ${levelErr.message}`);
  if (!firstLevel) throw new Error("Mesa não tem estrutura de blinds configurada.");

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

/**
 * V1.3 — Pausa todas as matches JOGANDO do evento. Útil pro admin
 * cortar tudo de uma vez no intervalo.
 */
export async function pauseAllMatches(eventId: string): Promise<{ paused: number }> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, physical_table_id")
    .eq("event_id", eventId)
    .eq("state", "JOGANDO");

  if (!matches || matches.length === 0) return { paused: 0 };

  const now = new Date().toISOString();
  const matchIds = matches.map((m) => m.id);
  const tableIds = matches.map((m) => m.physical_table_id);

  await Promise.all([
    supabase
      .from("matches")
      .update({ state: "PAUSADA", paused_at: now })
      .in("id", matchIds),
    supabase.from("physical_tables").update({ state: "PAUSADA" }).in("id", tableIds),
  ]);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/tv`);
  revalidatePath(`/tv/${eventId}`);
  return { paused: matches.length };
}

/**
 * V1.3 — Retoma todas as matches PAUSADA do evento. Soma o tempo
 * de pausa em cada uma pro cronômetro não pular.
 */
export async function resumeAllMatches(eventId: string): Promise<{ resumed: number }> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, physical_table_id, paused_at, total_paused_ms")
    .eq("event_id", eventId)
    .eq("state", "PAUSADA");

  if (!matches || matches.length === 0) return { resumed: 0 };

  const now = Date.now();
  // Cada match tem seu próprio paused_at — calcula delta individual.
  await Promise.all(
    matches.flatMap((m) => {
      const pausedAt = m.paused_at ? new Date(m.paused_at).getTime() : now;
      const additionalPause = Math.max(0, now - pausedAt);
      const newTotal = Number(m.total_paused_ms ?? 0) + additionalPause;
      return [
        supabase
          .from("matches")
          .update({ state: "JOGANDO", paused_at: null, total_paused_ms: newTotal })
          .eq("id", m.id),
        supabase
          .from("physical_tables")
          .update({ state: "JOGANDO" })
          .eq("id", m.physical_table_id),
      ];
    }),
  );

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/tv`);
  revalidatePath(`/tv/${eventId}`);
  return { resumed: matches.length };
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
    .eq("physical_table_id", match.physical_table_id)
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
 * V1.3 — Admin move player de uma mesa pra outra (sem virar eliminação).
 * Funciona mesmo que o player esteja eliminado/saiu (admin pode reativar).
 *
 * - Apaga participação ativa na mesa atual (se houver)
 * - UPSERT participação na mesa nova (reaproveita row se já tinha histórico lá)
 * - Atualiza player.state pra JOGANDO
 * - Mesa destino: cria match se LIVRE, transiciona LIVRE→JOGANDO se existe match LIVRE
 */
export async function adminMovePlayer(input: {
  playerId: string;
  targetTableId: string;
}): Promise<{ matchId: string }> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1) Player + mesa destino + match destino + match origem em paralelo
  const [{ data: player }, { data: targetTable }] = await Promise.all([
    supabase.from("players").select("*").eq("id", input.playerId).maybeSingle(),
    supabase
      .from("physical_tables")
      .select("*")
      .eq("id", input.targetTableId)
      .maybeSingle(),
  ]);
  if (!player) throw new Error("Jogador não encontrado.");
  if (!targetTable) throw new Error("Mesa destino não encontrada.");
  if (targetTable.event_id !== player.event_id) {
    throw new Error("Mesa pertence a outro evento.");
  }
  if (targetTable.state === "FINALIZADA") {
    throw new Error("Mesa destino está finalizada.");
  }

  // 2) Participação ativa atual (se houver) — pra apagar depois
  const { data: currentPart } = await supabase
    .from("participations")
    .select("id, match_id")
    .eq("player_id", input.playerId)
    .is("eliminated_at", null)
    .limit(1)
    .maybeSingle();

  // 3) Match ativo na mesa destino
  const [{ data: existingMatch }, { data: firstLevel }, { data: lastMatch }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .eq("physical_table_id", input.targetTableId)
        .in("state", ["JOGANDO", "PAUSADA", "LIVRE"])
        .order("match_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("blind_levels")
        .select("*")
        .eq("physical_table_id", input.targetTableId)
        .eq("is_final_table", false)
        .order("level_number", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("matches")
        .select("match_number")
        .eq("event_id", player.event_id)
        .order("match_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  let targetMatchId: string;
  if (existingMatch) {
    targetMatchId = existingMatch.id;
    // Se LIVRE, transiciona pra JOGANDO
    if (existingMatch.state === "LIVRE") {
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from("matches")
          .update({ state: "JOGANDO", level_started_at: now, started_at: now })
          .eq("id", existingMatch.id),
        supabase
          .from("physical_tables")
          .update({ state: "JOGANDO" })
          .eq("id", input.targetTableId),
      ]);
    }
  } else {
    // Cria match novo
    if (targetTable.state !== "LIVRE") {
      throw new Error(`Mesa destino em estado ${targetTable.state} sem partida ativa.`);
    }
    if (!firstLevel) throw new Error("Mesa destino sem blinds configurados.");
    const matchNumber = (lastMatch?.match_number ?? 0) + 1;
    const now = new Date().toISOString();
    const { data: created, error: cErr } = await supabase
      .from("matches")
      .insert({
        event_id: player.event_id,
        physical_table_id: input.targetTableId,
        match_number: matchNumber,
        is_final_table: false,
        state: "JOGANDO",
        current_level_id: firstLevel.id,
        level_started_at: now,
        started_at: now,
        total_paused_ms: 0,
      })
      .select()
      .single();
    if (cErr || !created) throw new Error(`Erro ao criar partida: ${cErr?.message ?? "?"}`);
    targetMatchId = created.id;
    await supabase
      .from("physical_tables")
      .update({ state: "JOGANDO" })
      .eq("id", input.targetTableId);
  }

  // 4) Apaga participação atual (se em outra mesa)
  if (currentPart && currentPart.match_id !== targetMatchId) {
    await supabase.from("participations").delete().eq("id", currentPart.id);
  }

  // 5) Calcula seat livre + UPSERT participação destino
  const { data: occupiedSeats } = await supabase
    .from("participations")
    .select("seat_number")
    .eq("match_id", targetMatchId)
    .is("eliminated_at", null);
  const taken = new Set(
    (occupiedSeats ?? []).map((p) => p.seat_number).filter((n): n is number => n != null),
  );
  let seat = 1;
  while (taken.has(seat)) seat++;

  const { error: partErr } = await supabase.from("participations").upsert(
    {
      match_id: targetMatchId,
      player_id: input.playerId,
      seat_number: seat,
      eliminated_at: null,
      eliminated_by_player_id: null,
      final_position: null,
    },
    { onConflict: "match_id,player_id" },
  );
  if (partErr) throw new Error(`Erro ao mover player: ${partErr.message}`);

  // 6) Player.state = JOGANDO + zera final_position (caso estivesse eliminado)
  await supabase
    .from("players")
    .update({ state: "JOGANDO", final_position: null })
    .eq("id", input.playerId);

  revalidatePath(`/admin/events/${player.event_id}`);
  revalidatePath(`/admin/events/${player.event_id}/tv`);
  revalidatePath(`/tv/${player.event_id}`);

  return { matchId: targetMatchId };
}

/**
 * V1.3: Ajusta o cronômetro do nível atual em +/- segundos.
 * Implementado deslocando `level_started_at`: somar +60s ao timestamp
 * faz o cronômetro "achar" que começou 60s depois → 60s a mais de tempo restante.
 *
 * Permite valores negativos (admin retira tempo). Cronômetro pode ficar
 * negativo — segue o mesmo princípio do V1.1.
 */
export async function adjustMatchTime(input: {
  matchId: string;
  deltaSeconds: number;
}): Promise<void> {
  const { matchId, deltaSeconds } = input;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) {
    throw new Error("Delta inválido.");
  }
  await requireAdmin();
  const match = await loadMatch(matchId);
  if (match.state !== "JOGANDO" && match.state !== "PAUSADA") {
    throw new Error(`Não dá pra ajustar cronômetro em mesa ${match.state}.`);
  }
  if (!match.level_started_at) {
    throw new Error("Mesa sem cronômetro iniciado.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const newStarted = new Date(
    new Date(match.level_started_at).getTime() + deltaSeconds * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("matches")
    .update({ level_started_at: newStarted })
    .eq("id", matchId);
  if (error) throw new Error(`Erro ao ajustar cronômetro: ${error.message}`);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/admin/events/${match.event_id}/tv`);
  revalidatePath(`/tv/${match.event_id}`);
}

/**
 * V1.3: Reinicia o cronômetro do nível atual de volta à duração cheia.
 * Não muda o nível, só "rebobina" o tempo do nível corrente.
 *
 * - JOGANDO → continua JOGANDO; level_started_at = now, total_paused_ms = 0.
 * - PAUSADA → continua PAUSADA; seta paused_at = now também, pra exibir o tempo
 *   cheio congelado (elapsed = 0).
 */
export async function resetMatchTimer(matchId: string): Promise<void> {
  await requireAdmin();
  const match = await loadMatch(matchId);
  if (match.state !== "JOGANDO" && match.state !== "PAUSADA") {
    throw new Error(`Não dá pra reiniciar cronômetro em mesa ${match.state}.`);
  }
  if (!match.current_level_id) {
    throw new Error("Mesa sem nível atual.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("matches")
    .update({
      level_started_at: now,
      total_paused_ms: 0,
      paused_at: match.state === "PAUSADA" ? now : null,
    })
    .eq("id", matchId);
  if (error) throw new Error(`Erro ao reiniciar cronômetro: ${error.message}`);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/admin/events/${match.event_id}/tv`);
  revalidatePath(`/tv/${match.event_id}`);
}

/**
 * V1.3: Reinicia a mesa por completo.
 *
 * Encerra o match atual sem vencedor (state=FINALIZADA, winner=null), remove
 * todas as participações ATIVAS (jogadores voltam pra PRESENTE), e a mesa
 * volta a LIVRE. Eliminados anteriores ficam intactos — preserva histórico.
 *
 * Próximo player que entrar pelo /me cria um match novo no nível 1.
 *
 * Sem undo.
 */
export async function resetTable(physicalTableId: string): Promise<void> {
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

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("physical_table_id", physicalTableId)
    .neq("state", "FINALIZADA")
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (match) {
    const { data: activeParts } = await supabase
      .from("participations")
      .select("id, player_id")
      .eq("match_id", match.id)
      .is("eliminated_at", null);

    if (activeParts && activeParts.length > 0) {
      const partIds = activeParts.map((p) => p.id);
      const activePlayerIds = activeParts.map((p) => p.player_id);

      const { error: delErr } = await supabase
        .from("participations")
        .delete()
        .in("id", partIds);
      if (delErr) throw new Error(`Erro ao remover participações: ${delErr.message}`);

      const { error: pErr } = await supabase
        .from("players")
        .update({ state: "PRESENTE" })
        .in("id", activePlayerIds);
      if (pErr) throw new Error(`Erro ao atualizar jogadores: ${pErr.message}`);
    }

    const { error: mErr } = await supabase
      .from("matches")
      .update({
        state: "FINALIZADA",
        finished_at: new Date().toISOString(),
        winner_player_id: null,
      })
      .eq("id", match.id);
    if (mErr) throw new Error(`Erro ao encerrar partida: ${mErr.message}`);
  }

  const { error: tabErr } = await supabase
    .from("physical_tables")
    .update({ state: "LIVRE" })
    .eq("id", physicalTableId);
  if (tabErr) throw new Error(`Erro ao resetar mesa: ${tabErr.message}`);

  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/admin/events/${table.event_id}/tv`);
  revalidatePath(`/tv/${table.event_id}`);
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
  eliminatedByPlayerId?: string | null;
}): Promise<{ finalPosition: number }> {
  const { matchId, playerId, eliminatedByPlayerId } = input;
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
    .select("state, final_position, has_paid_buyin")
    .eq("id", playerId)
    .maybeSingle();
  if (plErr) throw new Error(`Erro ao ler jogador: ${plErr.message}`);
  if (!player) throw new Error("Jogador não encontrado.");

  const now = new Date().toISOString();

  // V1.1: sempre ELIMINADO (sem mapeamento VICE/TERCEIRO/OUTROS_FINALISTAS).
  // final_position é salvo no PARTICIPATION pra o Pódio. No player, também
  // gravamos final_position pra que o Pódio identifique 2º, 3º, etc. pelo
  // valor (1=campeão via detectChampion, 2=penúltimo eliminado, etc.).
  // Calculamos a posição event-wide: total de eliminações + 1 = posição
  // do que está saindo agora (contando que o campeão será 1).
  const newPlayerState: PlayerState = "ELIMINADO";

  // Posição event-wide: quantos players ainda estão JOGANDO no evento todo
  // (incluindo o que sai agora) = posição final desse player.
  const { count: eventActiveCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("event_id", match.event_id)
    .eq("state", "JOGANDO");
  const newPlayerFinalPosition = eventActiveCount ?? finalPosition;

  // Valida eliminatedByPlayerId — deve estar na mesma mesa, ativo, e não ser o próprio.
  let resolvedKillerId: string | null = null;
  if (eliminatedByPlayerId && eliminatedByPlayerId !== playerId) {
    const { data: killerPart } = await supabase
      .from("participations")
      .select("player_id")
      .eq("match_id", matchId)
      .eq("player_id", eliminatedByPlayerId)
      .is("eliminated_at", null)
      .maybeSingle();
    if (killerPart) resolvedKillerId = eliminatedByPlayerId;
  }

  const { error: updPartErr } = await supabase
    .from("participations")
    .update({
      eliminated_at: now,
      final_position: finalPosition,
      eliminated_by_player_id: resolvedKillerId,
    })
    .eq("id", participation.id);
  if (updPartErr) throw new Error(`Erro ao atualizar participação: ${updPartErr.message}`);

  const { error: updPlErr } = await supabase
    .from("players")
    .update({
      state: newPlayerState,
      final_position: newPlayerFinalPosition,
      has_paid_buyin: false, // V1.3: precisa rebuy pra voltar
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
      playerHasPaidBuyin: player.has_paid_buyin ?? false,
    },
  });

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);

  // V1.3: SEM coroação automática. Admin define o campeão manualmente
  // via crownChampion() na página do evento.

  return { finalPosition };
}

/**
 * @deprecated V1.1: Mesas não terminam mais automaticamente.
 *   - Mesas classificatórias deixaram de existir como conceito (não há mais
 *     CLASSIFICADO/MESA_FINAL na V1.1)
 *   - O fluxo agora é: eliminate → eliminate → ... → detectChampionAndEndEvent
 *     (em champion-detection.ts) define CAMPEAO + ENCERRADO automaticamente
 *
 * Esta função permanece exportada APENAS para compatibilidade com undo de
 * dados anteriores à V1.1. Não deve ser chamada de UIs novas.
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
        .update({ eliminated_at: null, final_position: null, eliminated_by_player_id: null })
        .eq("id", payload.participationId);
      await supabase
        .from("players")
        .update({
          state: payload.previousState.playerState,
          final_position: payload.previousState.playerFinalPosition,
          // Fallback `true` cobre action_log antigo (pré V1.3) sem o campo —
          // se errarmos, admin desmarca manualmente; é melhor do que travar
          // player sem rebuy.
          has_paid_buyin: payload.previousState.playerHasPaidBuyin ?? true,
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
    case "CHAMPION_DETECTED": {
      // V1.1: reverte CAMPEAO → estado anterior + ENCERRADO → estado anterior
      await supabase
        .from("players")
        .update({
          state: payload.previousChampionState.state,
          final_position: payload.previousChampionState.finalPosition,
        })
        .eq("id", payload.championId);
      await supabase
        .from("events")
        .update({ state: payload.previousEventState.state as EventState })
        .eq("id", payload.eventId);
      break;
    }
    case "EVENT_MANUALLY_ENDED": {
      // V1.1: reverte ENCERRADO → estado anterior + (se aplicável) descoroar
      if (payload.crownedChampionId && payload.previousChampionState) {
        await supabase
          .from("players")
          .update({
            state: payload.previousChampionState.state,
            final_position: payload.previousChampionState.finalPosition,
          })
          .eq("id", payload.crownedChampionId);
      }
      await supabase
        .from("events")
        .update({ state: payload.previousState.state as EventState })
        .eq("id", payload.eventId);
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

// V1.1: `releaseFinishedTable` removida. Mesas não renovam mais.
// Comentário preservado por arqueologia: a função antes transicionava
// physical_tables.state FINALIZADA → LIVRE pra preparar pra próxima partida.

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
