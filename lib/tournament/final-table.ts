"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { logAction } from "@/lib/tournament/action-log";
import type { TablesInsert as Inserts } from "@/lib/types/database.types";

export type FinalTableEligibility = {
  canTransition: boolean;
  reason?: string;
  classifiedCount: number;
  queueCount: number;
  activeMatchCount: number;
};

/**
 * Verifica se o evento está apto a transitar EM_ANDAMENTO → MESA_FINAL.
 *
 * Pré-condições (todas obrigatórias):
 *   - Evento em EM_ANDAMENTO
 *   - Pelo menos 2 jogadores CLASSIFICADO
 *   - Nenhuma partida em JOGANDO ou PAUSADA (classificatórias todas resolvidas)
 *
 * (Fila com PRESENTE > 0 não bloqueia — admin decide se acompanha
 * ou ignora restantes.)
 */
export async function canTransitionToFinalTable(
  eventId: string,
): Promise<FinalTableEligibility> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: event }, classifiedRes, queueRes, activeRes] = await Promise.all([
    supabase.from("events").select("state").eq("id", eventId).maybeSingle(),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("state", "CLASSIFICADO"),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("state", "PRESENTE"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("state", ["JOGANDO", "PAUSADA"]),
  ]);

  const classifiedCount = classifiedRes.count ?? 0;
  const queueCount = queueRes.count ?? 0;
  const activeMatchCount = activeRes.count ?? 0;

  if (!event) {
    return {
      canTransition: false,
      reason: "Evento não encontrado.",
      classifiedCount,
      queueCount,
      activeMatchCount,
    };
  }

  if (event.state !== "EM_ANDAMENTO") {
    return {
      canTransition: false,
      reason: `Evento em estado ${event.state}, esperava EM_ANDAMENTO.`,
      classifiedCount,
      queueCount,
      activeMatchCount,
    };
  }

  if (classifiedCount < 2) {
    return {
      canTransition: false,
      reason: `Precisa de pelo menos 2 classificados (atual: ${classifiedCount}).`,
      classifiedCount,
      queueCount,
      activeMatchCount,
    };
  }

  if (activeMatchCount > 0) {
    return {
      canTransition: false,
      reason: `Ainda há ${activeMatchCount} partida(s) em andamento.`,
      classifiedCount,
      queueCount,
      activeMatchCount,
    };
  }

  return { canTransition: true, classifiedCount, queueCount, activeMatchCount };
}

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
 * Faz a transição EM_ANDAMENTO → MESA_FINAL de forma atômica:
 *   - Valida pré-condições (via canTransitionToFinalTable)
 *   - Escolhe physical_table 1 como mesa final, libera ela
 *   - Cria match com is_final_table=true, state=LIVRE
 *   - Cria participations pros classificados (cadeiras sorteadas)
 *   - Promove CLASSIFICADO → NA_FINAL
 *   - event.state = MESA_FINAL
 *   - Loga TRANSITION_TO_FINAL
 *
 * Admin precisa clicar "Iniciar Mesa Final" depois pra começar a contar tempo.
 */
export async function transitionToFinalTable(
  eventId: string,
): Promise<{ matchId: string }> {
  await requireAdmin();

  const eligibility = await canTransitionToFinalTable(eventId);
  if (!eligibility.canTransition) {
    throw new Error(eligibility.reason ?? "Não é possível ir pra mesa final.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Mesa física a ser usada como mesa final: a de menor table_number
  const { data: tables, error: tErr } = await supabase
    .from("physical_tables")
    .select("*")
    .eq("event_id", eventId)
    .order("table_number", { ascending: true });
  if (tErr) throw new Error(`Erro ao ler mesas: ${tErr.message}`);
  if (!tables || tables.length === 0) {
    throw new Error("Evento sem mesas físicas.");
  }
  const finalTable = tables[0]!;

  // 2. Próximo nível: prefere is_final_table=true, fallback ao 1º normal
  const { data: finalLevels } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_final_table", true)
    .order("level_number", { ascending: true })
    .limit(1);

  let chosenLevel = finalLevels?.[0];
  if (!chosenLevel) {
    const { data: classLevels } = await supabase
      .from("blind_levels")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_final_table", false)
      .order("level_number", { ascending: true })
      .limit(1);
    chosenLevel = classLevels?.[0];
  }
  if (!chosenLevel) throw new Error("Evento sem nenhum nível de blind configurado.");

  // 3. Próximo match_number
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("match_number")
    .eq("event_id", eventId)
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const matchNumber = (lastMatch?.match_number ?? 0) + 1;

  // 4. Libera a mesa final (caso esteja FINALIZADA)
  await supabase
    .from("physical_tables")
    .update({ state: "LIVRE" })
    .eq("id", finalTable.id);

  // 5. Classificados → será mexido depois
  const { data: classificados, error: clErr } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .eq("state", "CLASSIFICADO");
  if (clErr) throw new Error(`Erro ao ler classificados: ${clErr.message}`);
  if (!classificados || classificados.length < 2) {
    throw new Error("Precisa de pelo menos 2 classificados pra montar mesa final.");
  }

  // 6. Cria match (LIVRE, sem level_started_at)
  const matchInsert: Inserts<"matches"> = {
    event_id: eventId,
    physical_table_id: finalTable.id,
    match_number: matchNumber,
    is_final_table: true,
    state: "LIVRE",
    current_level_id: chosenLevel.id,
    total_paused_ms: 0,
  };
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert(matchInsert)
    .select()
    .single();
  if (matchErr || !match) {
    throw new Error(`Erro ao criar mesa final: ${matchErr?.message ?? "?"}`);
  }

  // 7. Participations com cadeiras sorteadas
  const playerIds = classificados.map((p) => p.id);
  const seats = shuffle(playerIds);
  const partRows: Inserts<"participations">[] = seats.map((pid, idx) => ({
    match_id: match.id,
    player_id: pid,
    seat_number: idx + 1,
  }));
  const { error: partErr } = await supabase.from("participations").insert(partRows);
  if (partErr) {
    await supabase.from("matches").delete().eq("id", match.id);
    throw new Error(`Erro ao registrar participações: ${partErr.message}`);
  }

  // 8. Players CLASSIFICADO → NA_FINAL
  const { error: upPlErr } = await supabase
    .from("players")
    .update({ state: "NA_FINAL" })
    .in("id", playerIds);
  if (upPlErr) throw new Error(`Erro ao promover finalistas: ${upPlErr.message}`);

  // 9. Event.state → MESA_FINAL
  const { error: upEvErr } = await supabase
    .from("events")
    .update({ state: "MESA_FINAL" })
    .eq("id", eventId);
  if (upEvErr) throw new Error(`Erro ao transitar evento: ${upEvErr.message}`);

  // 10. Log
  await logAction(supabase, eventId, {
    type: "TRANSITION_TO_FINAL",
    eventId,
    previousState: { eventState: "EM_ANDAMENTO" },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/tv/${eventId}`);
  return { matchId: match.id };
}

/**
 * Inicia a contagem da mesa final: match LIVRE → JOGANDO.
 * Não cria participações (já feitas em transitionToFinalTable).
 */
export async function startFinalMatch(matchId: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (mErr) throw new Error(`Erro ao ler partida: ${mErr.message}`);
  if (!match) throw new Error("Partida não encontrada.");
  if (!match.is_final_table) {
    throw new Error("startFinalMatch só funciona em mesa final.");
  }
  if (match.state !== "LIVRE") {
    throw new Error(`Mesa final em estado ${match.state}, esperava LIVRE.`);
  }

  const now = new Date().toISOString();

  const { error: upMatch } = await supabase
    .from("matches")
    .update({ state: "JOGANDO", level_started_at: now, started_at: now, total_paused_ms: 0 })
    .eq("id", matchId);
  if (upMatch) throw new Error(`Erro ao iniciar mesa final: ${upMatch.message}`);

  const { error: upTbl } = await supabase
    .from("physical_tables")
    .update({ state: "JOGANDO" })
    .eq("id", match.physical_table_id);
  if (upTbl) throw new Error(`Erro ao atualizar mesa: ${upTbl.message}`);

  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);
}
