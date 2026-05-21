"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { canTransitionMatch, transitionErrorMessage } from "@/lib/tournament/transitions";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";
import type { MatchState } from "@/lib/types/domain";

type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

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
 * Cria match (JOGANDO), participations com cadeiras sorteadas, e atualiza
 * players → JOGANDO, physical_table → JOGANDO. Loga START_MATCH.
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

  // 1. Busca mesa + evento
  const { data: table, error: tableErr } = await supabase
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();

  if (tableErr) throw new Error(`Erro ao buscar mesa: ${tableErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");
  if (table.state !== "LIVRE") {
    throw new Error(`Mesa não está LIVRE (estado atual: ${table.state}).`);
  }

  // 2. Primeiro nível (classificatórias)
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

  // 3. Próximo match_number do evento
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("match_number")
    .eq("event_id", table.event_id)
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const matchNumber = (lastMatch?.match_number ?? 0) + 1;
  const startedAt = new Date().toISOString();

  // 4. Cria match
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

  // 5. Participations (com cadeiras)
  const seats = randomizeSeats
    ? shuffle(playerIds)
    : playerIds.slice();

  const participations: Inserts<"participations">[] = seats.map((playerId, idx) => ({
    match_id: match.id,
    player_id: playerId,
    seat_number: idx + 1,
  }));

  const { error: partErr } = await supabase.from("participations").insert(participations);
  if (partErr) {
    // cleanup best-effort
    await supabase.from("matches").delete().eq("id", match.id);
    throw new Error(`Erro ao registrar participações: ${partErr.message}`);
  }

  // 6. Players → JOGANDO
  const { error: playerErr } = await supabase
    .from("players")
    .update({ state: "JOGANDO" })
    .in("id", playerIds);

  if (playerErr) throw new Error(`Erro ao atualizar jogadores: ${playerErr.message}`);

  // 7. Mesa física → JOGANDO
  const { error: tblErr } = await supabase
    .from("physical_tables")
    .update({ state: "JOGANDO" })
    .eq("id", physicalTableId);

  if (tblErr) throw new Error(`Erro ao atualizar mesa: ${tblErr.message}`);

  // 8. action_log
  await supabase.from("action_log").insert({
    event_id: table.event_id,
    action_type: "START_MATCH",
    payload: {
      matchId: match.id,
      physicalTableId,
      playerIds,
      previousState: { matchState: "LIVRE", tableState: "LIVRE" },
    },
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
 * Avança para o próximo nível de blind. Se já está no último, fica.
 * Zera total_paused_ms (pausas pertencem ao nível anterior).
 */
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

  // Carrega nível atual pra saber level_number
  const { data: currentLevel, error: curErr } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("id", match.current_level_id)
    .maybeSingle();
  if (curErr) throw new Error(`Erro ao ler nível atual: ${curErr.message}`);
  if (!currentLevel) throw new Error("Nível atual não encontrado.");

  // Próximo nível: mesmo evento, mesmo is_final_table, level_number maior
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
    // último nível — não avança, mas não é erro
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
 * Carrega todas as matches de um evento com nível atual em payload separado.
 * Útil pra TV e admin.
 */
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
