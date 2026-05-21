"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";

type Player = Tables<"players">;
type Match = Tables<"matches">;
type PhysicalTable = Tables<"physical_tables">;

/**
 * V1.2 — Player se auto-junta a uma mesa do evento em que está inscrito.
 *
 * Regras:
 *   - Player precisa estar logado E ter profile_id ligado a um players row do evento.
 *   - Player só pode estar em 1 mesa ativa por vez. Se já está em JOGANDO em
 *     outra mesa, precisa sair primeiro.
 *   - Mesa LIVRE: cria nova match (state=JOGANDO, level_started_at=now)
 *     com este player como primeiro participation.
 *   - Mesa JOGANDO/PAUSADA: insere participation no match ativo.
 *   - Mesa FINALIZADA: bloqueia (V1.1 — mesas não renovam).
 */
export async function joinTableAsPlayer(physicalTableId: string): Promise<{ matchId: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  // Lookup do player do current user na mesa requerida
  const { data: table, error: tErr } = await supabase
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();
  if (tErr) throw new Error(`Erro ao ler mesa: ${tErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");
  if (table.state === "FINALIZADA") {
    throw new Error("Esta mesa já foi finalizada — não dá pra entrar.");
  }

  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", table.event_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (pErr) throw new Error(`Erro ao ler player: ${pErr.message}`);
  if (!player) {
    throw new Error("Você não está cadastrado neste evento. Peça pro admin te adicionar.");
  }

  // Verifica se já está em outra mesa ativa
  if (player.state === "JOGANDO") {
    const { data: activePart } = await supabase
      .from("participations")
      .select("match_id, matches:match_id(physical_table_id)")
      .eq("player_id", player.id)
      .is("eliminated_at", null)
      .limit(1)
      .maybeSingle();

    type MatchRef = { physical_table_id: string } | { physical_table_id: string }[] | null;
    const matchRef = (activePart?.matches ?? null) as MatchRef;
    const currentTableId = Array.isArray(matchRef)
      ? matchRef[0]?.physical_table_id
      : matchRef?.physical_table_id;

    if (currentTableId && currentTableId !== physicalTableId) {
      throw new Error(
        "Você já está em outra mesa. Saia da mesa atual antes de entrar em outra.",
      );
    }
    if (currentTableId === physicalTableId) {
      // Já está nesta mesa — idempotente
      return { matchId: activePart!.match_id };
    }
  }

  // Encontra ou cria match na mesa
  let match: Match | null;
  const { data: existing } = await supabase
    .from("matches")
    .select("*")
    .eq("physical_table_id", physicalTableId)
    .in("state", ["JOGANDO", "PAUSADA", "LIVRE"])
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    match = existing;
    // Se LIVRE, transitiona pra JOGANDO ao primeiro entrar
    if (existing.state === "LIVRE") {
      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("matches")
        .update({ state: "JOGANDO", level_started_at: now, started_at: now })
        .eq("id", existing.id);
      if (updErr) throw new Error(`Erro ao iniciar mesa: ${updErr.message}`);
      await supabase
        .from("physical_tables")
        .update({ state: "JOGANDO" })
        .eq("id", physicalTableId);
    }
  } else {
    // Cria nova match (primeira partida na mesa LIVRE)
    if (table.state !== "LIVRE") {
      throw new Error(`Mesa em estado ${table.state} sem partida ativa — fluxo inesperado.`);
    }

    // Pega primeiro nível de blinds do evento
    const { data: firstLevel } = await supabase
      .from("blind_levels")
      .select("*")
      .eq("event_id", table.event_id)
      .eq("is_final_table", false)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!firstLevel) throw new Error("Evento sem blinds configurados.");

    const { data: lastMatch } = await supabase
      .from("matches")
      .select("match_number")
      .eq("event_id", table.event_id)
      .order("match_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const matchNumber = (lastMatch?.match_number ?? 0) + 1;
    const now = new Date().toISOString();

    const insert: Inserts<"matches"> = {
      event_id: table.event_id,
      physical_table_id: physicalTableId,
      match_number: matchNumber,
      is_final_table: false,
      state: "JOGANDO",
      current_level_id: firstLevel.id,
      level_started_at: now,
      started_at: now,
      total_paused_ms: 0,
    };
    const { data: created, error: cErr } = await supabase
      .from("matches")
      .insert(insert)
      .select()
      .single();
    if (cErr || !created) throw new Error(`Erro ao criar partida: ${cErr?.message ?? "?"}`);
    match = created;

    await supabase
      .from("physical_tables")
      .update({ state: "JOGANDO" })
      .eq("id", physicalTableId);
  }

  if (!match) throw new Error("Erro: match não resolvido.");

  // Calcula próxima cadeira disponível
  const { data: occupiedSeats } = await supabase
    .from("participations")
    .select("seat_number")
    .eq("match_id", match.id);
  const taken = new Set((occupiedSeats ?? []).map((p) => p.seat_number).filter((n): n is number => n != null));
  let seat = 1;
  while (taken.has(seat)) seat++;

  // Insere participation
  const { error: partErr } = await supabase.from("participations").insert({
    match_id: match.id,
    player_id: player.id,
    seat_number: seat,
  });
  if (partErr) throw new Error(`Erro ao entrar na mesa: ${partErr.message}`);

  // Atualiza player.state
  await supabase.from("players").update({ state: "JOGANDO" }).eq("id", player.id);

  revalidatePath("/me");
  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/tv/${table.event_id}`);

  return { matchId: match.id };
}

/**
 * V1.2 — Player sai da mesa atual (voluntariamente).
 * Delete a participation ativa, retorna player pra PRESENTE.
 */
export async function leaveCurrentTable(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("profile_id", user.id)
    .eq("state", "JOGANDO")
    .limit(1)
    .maybeSingle();
  if (!player) throw new Error("Você não está em nenhuma mesa.");

  // Acha participation ativa
  const { data: participation } = await supabase
    .from("participations")
    .select("id, match_id")
    .eq("player_id", player.id)
    .is("eliminated_at", null)
    .limit(1)
    .maybeSingle();

  if (participation) {
    await supabase.from("participations").delete().eq("id", participation.id);
  }

  await supabase.from("players").update({ state: "PRESENTE" }).eq("id", player.id);

  revalidatePath("/me");
  revalidatePath(`/admin/events/${player.event_id}`);
  revalidatePath(`/tv/${player.event_id}`);
}

/**
 * V1.2 — Retorna dados pro /me: eventos do user com mesas e o status do user em cada.
 */
export type MyEventView = {
  event: Tables<"events">;
  player: Player;
  tables: PhysicalTable[];
  myMatchTableId: string | null; // mesa onde o user tá agora (active participation), se houver
};

export async function getMyEvents(): Promise<MyEventView[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Players do user
  const { data: myPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (!myPlayers || myPlayers.length === 0) return [];

  const eventIds = myPlayers.map((p) => p.event_id);

  const [{ data: events }, { data: tables }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .order("event_date", { ascending: false }),
    supabase
      .from("physical_tables")
      .select("*")
      .in("event_id", eventIds)
      .order("table_number", { ascending: true }),
  ]);

  // Active participation pra cada player
  const playerIds = myPlayers.map((p) => p.id);
  const { data: activeParts } = await supabase
    .from("participations")
    .select("player_id, matches:match_id(physical_table_id)")
    .in("player_id", playerIds)
    .is("eliminated_at", null);

  type MatchRef = { physical_table_id: string } | { physical_table_id: string }[] | null;
  const partsByPlayer = new Map<string, string>();
  for (const ap of activeParts ?? []) {
    const matchRef = (ap.matches ?? null) as MatchRef;
    const tableId = Array.isArray(matchRef)
      ? matchRef[0]?.physical_table_id
      : matchRef?.physical_table_id;
    if (tableId) partsByPlayer.set(ap.player_id, tableId);
  }

  const tablesByEvent = new Map<string, PhysicalTable[]>();
  for (const t of tables ?? []) {
    const arr = tablesByEvent.get(t.event_id) ?? [];
    arr.push(t);
    tablesByEvent.set(t.event_id, arr);
  }

  return myPlayers.map<MyEventView>((player) => {
    const event = (events ?? []).find((e) => e.id === player.event_id)!;
    return {
      event,
      player,
      tables: tablesByEvent.get(player.event_id) ?? [],
      myMatchTableId: partsByPlayer.get(player.id) ?? null,
    };
  });
}
