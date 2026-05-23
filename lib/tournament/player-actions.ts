"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/tournament/auth";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import type { Database, Tables, TablesInsert as Inserts } from "@/lib/types/database.types";

type Player = Tables<"players">;
type Match = Tables<"matches">;
type PhysicalTable = Tables<"physical_tables">;

/**
 * Cliente service_role pra writes privilegiados (matches, physical_tables) que
 * o RLS bloqueia pro player comum. Identidade já foi validada via cookie client
 * antes — a service_role só faz o write depois do gate.
 */
function privilegedClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

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
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");
  // 10 entradas/saídas por minuto por user — protege contra spam de tap
  checkRateLimit(`join:${userId}`, 10, 60_000);

  const admin = privilegedClient();

  // 1) Mesa primeiro (precisamos do event_id pras outras queries)
  const { data: table, error: tErr } = await admin
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();
  if (tErr) throw new Error(`Erro ao ler mesa: ${tErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");
  if (table.state === "FINALIZADA") {
    throw new Error("Esta mesa já foi finalizada — não dá pra entrar.");
  }

  // 2) Em paralelo: player, match existente, firstLevel (caso seja LIVRE), lastMatch
  const [
    { data: player, error: pErr },
    { data: existing },
    { data: firstLevel },
    { data: lastMatch },
  ] = await Promise.all([
    admin
      .from("players")
      .select("*")
      .eq("event_id", table.event_id)
      .eq("profile_id", userId)
      .maybeSingle(),
    admin
      .from("matches")
      .select("*")
      .eq("physical_table_id", physicalTableId)
      .in("state", ["JOGANDO", "PAUSADA", "LIVRE"])
      .order("match_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("blind_levels")
      .select("*")
      .eq("physical_table_id", physicalTableId)
      .eq("is_final_table", false)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("matches")
      .select("match_number")
      .eq("event_id", table.event_id)
      .order("match_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pErr) throw new Error(`Erro ao ler player: ${pErr.message}`);
  if (!player) {
    throw new Error("Você não está cadastrado neste evento. Peça pro admin te adicionar.");
  }
  // V1.3: gate de pagamento — só entra na mesa quem o admin marcou como pago.
  // Após eliminação, paid vira false (precisa de admin marcar rebuy).
  if (!player.has_paid_buyin) {
    throw new Error("Buy-in pendente. Peça pro admin marcar você como pago.");
  }

  // 3) Se player JOGANDO, valida que não está em outra mesa (consulta extra só nesse caso)
  if (player.state === "JOGANDO") {
    const { data: activePart } = await admin
      .from("participations")
      .select("match_id")
      .eq("player_id", player.id)
      .is("eliminated_at", null)
      .limit(1)
      .maybeSingle();

    if (activePart) {
      const { data: currentMatch } = await admin
        .from("matches")
        .select("physical_table_id")
        .eq("id", activePart.match_id)
        .maybeSingle();
      const currentTableId = currentMatch?.physical_table_id;

      if (currentTableId && currentTableId !== physicalTableId) {
        throw new Error(
          "Você já está em outra mesa. Saia da mesa atual antes de entrar em outra.",
        );
      }
      if (currentTableId === physicalTableId) {
        return { matchId: activePart.match_id };
      }
    }
  }

  // 4) Encontra ou cria match na mesa.
  //
  // Mesa nova começa PAUSADA, NÃO JOGANDO. O admin tem que clicar "Retomar"
  // na config de TV pra iniciar o cronômetro. Mantém paused_at=now pra que
  // o math de resume (pauseElapsed) compute corretamente o total_paused_ms
  // — o cronômetro arranca cheio quando o admin solta.
  let match: Match | null;
  if (existing) {
    match = existing;
    if (existing.state === "LIVRE") {
      const now = new Date().toISOString();
      const [{ error: updErr }] = await Promise.all([
        admin
          .from("matches")
          .update({
            state: "PAUSADA",
            level_started_at: now,
            started_at: now,
            paused_at: now,
            total_paused_ms: 0,
          })
          .eq("id", existing.id),
        admin
          .from("physical_tables")
          .update({ state: "PAUSADA" })
          .eq("id", physicalTableId),
      ]);
      if (updErr) throw new Error(`Erro ao iniciar mesa: ${updErr.message}`);
    }
  } else {
    if (table.state !== "LIVRE") {
      throw new Error(`Mesa em estado ${table.state} sem partida ativa — fluxo inesperado.`);
    }
    if (!firstLevel) throw new Error("Mesa sem blinds configurados.");

    const matchNumber = (lastMatch?.match_number ?? 0) + 1;
    const now = new Date().toISOString();

    const insert: Inserts<"matches"> = {
      event_id: table.event_id,
      physical_table_id: physicalTableId,
      match_number: matchNumber,
      is_final_table: false,
      state: "PAUSADA",
      current_level_id: firstLevel.id,
      level_started_at: now,
      started_at: now,
      paused_at: now,
      total_paused_ms: 0,
    };
    const { data: created, error: cErr } = await admin
      .from("matches")
      .insert(insert)
      .select()
      .single();
    if (cErr || !created) throw new Error(`Erro ao criar partida: ${cErr?.message ?? "?"}`);
    match = created;

    await admin
      .from("physical_tables")
      .update({ state: "PAUSADA" })
      .eq("id", physicalTableId);
  }

  if (!match) throw new Error("Erro: match não resolvido.");

  // 5) Calcula próxima cadeira. Filtra por eliminated_at IS NULL — cadeira
  // de player eliminado/que saiu pode ser reaproveitada.
  const { data: occupiedSeats } = await admin
    .from("participations")
    .select("seat_number")
    .eq("match_id", match.id)
    .is("eliminated_at", null);
  const taken = new Set(
    (occupiedSeats ?? []).map((p) => p.seat_number).filter((n): n is number => n != null),
  );
  let seat = 1;
  while (taken.has(seat)) seat++;

  // 6) UPSERT participation: se já existe (player jogou nessa mesa antes e
  // foi eliminado), revive a row limpando eliminated_at / eliminated_by /
  // final_position. Evita o duplicate key constraint.
  const { error: partErr } = await admin.from("participations").upsert(
    {
      match_id: match.id,
      player_id: player.id,
      seat_number: seat,
      eliminated_at: null,
      eliminated_by_player_id: null,
      final_position: null,
    },
    { onConflict: "match_id,player_id" },
  );
  if (partErr) throw new Error(`Erro ao entrar na mesa: ${partErr.message}`);

  // 7) Só atualiza player.state DEPOIS do participation OK — evita estado
  // inconsistente (state=JOGANDO sem participation ativa) se algo falhar acima.
  await admin.from("players").update({ state: "JOGANDO" }).eq("id", player.id);

  revalidatePath("/me");
  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/tv/${table.event_id}`);

  return { matchId: match.id };
}

/**
 * V1.2 — Player sai da mesa atual (voluntariamente).
 * Delete a participation ativa, retorna player pra PRESENTE.
 *
 * V1.3: aceita `eventId` opcional pra desambiguar quando o user tem player
 * rows em múltiplos eventos JOGANDO ao mesmo tempo (admin testando, etc).
 * Se não passar, pega o primeiro JOGANDO (comportamento legado).
 */
export async function leaveCurrentTable(eventId?: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");

  const admin = privilegedClient();

  let playerQuery = admin
    .from("players")
    .select("*")
    .eq("profile_id", userId)
    .eq("state", "JOGANDO");
  if (eventId) playerQuery = playerQuery.eq("event_id", eventId);

  const { data: player } = await playerQuery.limit(1).maybeSingle();
  if (!player) throw new Error("Você não está em nenhuma mesa.");

  // Acha participation ativa
  const { data: participation } = await admin
    .from("participations")
    .select("id, match_id")
    .eq("player_id", player.id)
    .is("eliminated_at", null)
    .limit(1)
    .maybeSingle();

  if (participation) {
    await admin.from("participations").delete().eq("id", participation.id);
  }

  await admin.from("players").update({ state: "PRESENTE" }).eq("id", player.id);

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
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Usa service_role: evita RLS-recursion em players e queries são read-only.
  const admin = privilegedClient();

  // Players do user
  const { data: myPlayers } = await admin
    .from("players")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });
  if (!myPlayers || myPlayers.length === 0) return [];

  const eventIds = Array.from(new Set(myPlayers.map((p) => p.event_id)));
  const playerIds = myPlayers.map((p) => p.id);

  // 3 queries independentes em paralelo
  const [{ data: events }, { data: tables }, { data: activeParts }] =
    await Promise.all([
      admin
        .from("events")
        .select("*")
        .in("id", eventIds)
        .is("deleted_at", null)
        .order("event_date", { ascending: false }),
      admin
        .from("physical_tables")
        .select("*")
        .in("event_id", eventIds)
        .order("table_number", { ascending: true }),
      admin
        .from("participations")
        .select("player_id, match_id")
        .in("player_id", playerIds)
        .is("eliminated_at", null),
    ]);

  // Resolve match → physical_table
  const partsByPlayer = new Map<string, string>();
  const matchIds = Array.from(new Set((activeParts ?? []).map((p) => p.match_id)));
  if (matchIds.length > 0) {
    const { data: matches } = await admin
      .from("matches")
      .select("id, physical_table_id")
      .in("id", matchIds);
    const tableByMatch = new Map(
      (matches ?? []).map((m) => [m.id, m.physical_table_id]),
    );
    for (const ap of activeParts ?? []) {
      const tableId = tableByMatch.get(ap.match_id);
      if (tableId) partsByPlayer.set(ap.player_id, tableId);
    }
  }

  const tablesByEvent = new Map<string, PhysicalTable[]>();
  for (const t of tables ?? []) {
    const arr = tablesByEvent.get(t.event_id) ?? [];
    arr.push(t);
    tablesByEvent.set(t.event_id, arr);
  }

  return myPlayers
    .map<MyEventView | null>((player) => {
      const event = (events ?? []).find((e) => e.id === player.event_id);
      if (!event) return null;
      return {
        event,
        player,
        tables: tablesByEvent.get(player.event_id) ?? [],
        myMatchTableId: partsByPlayer.get(player.id) ?? null,
      };
    })
    .filter((x): x is MyEventView => x !== null);
}

/**
 * V1.3 — Retorna o estado da mesa pro player visualizar quem está nela.
 * Valida que o caller (logado) está cadastrado no evento desta mesa.
 *
 * Retorna mesa, match ativo (se houver), e a lista de participantes ativos
 * (não-eliminados) com nome/nickname.
 */
export type TableSeat = {
  participationId: string;
  playerId: string;
  seatNumber: number | null;
  name: string;
  nickname: string | null;
  isYou: boolean;
  avatarUrl: string | null;
  eliminationCount: number;
};

export type TableView = {
  table: PhysicalTable;
  match: Match | null;
  seats: TableSeat[];
  eventId: string;
  eventName: string;
  // Outras mesas do mesmo evento (pra UI de "trocar de mesa")
  otherTables: { id: string; tableNumber: number; state: string; seats: number }[];
};

export async function getTableForPlayer(physicalTableId: string): Promise<TableView | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const admin = privilegedClient();

  // 1) Mesa primeiro (precisamos do event_id pras outras queries)
  const { data: table } = await admin
    .from("physical_tables")
    .select("*")
    .eq("id", physicalTableId)
    .maybeSingle();
  if (!table) return null;

  // 2) Tudo que depende só do event_id roda em paralelo (4 queries em 1 RTT)
  const [
    { data: myPlayer },
    { data: event },
    { data: match },
    { data: others },
  ] = await Promise.all([
    admin
      .from("players")
      .select("id")
      .eq("event_id", table.event_id)
      .eq("profile_id", userId)
      .maybeSingle(),
    admin
      .from("events")
      .select("id, name")
      .eq("id", table.event_id)
      .maybeSingle(),
    admin
      .from("matches")
      .select("*")
      .eq("physical_table_id", physicalTableId)
      .in("state", ["JOGANDO", "PAUSADA", "LIVRE"])
      .order("match_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("physical_tables")
      .select("id, table_number, state")
      .eq("event_id", table.event_id)
      .neq("id", physicalTableId)
      .order("table_number", { ascending: true }),
  ]);

  if (!myPlayer) return null;
  if (!event) return null;

  // 3) Em paralelo: participations da mesa atual + matches das outras mesas
  const otherIds = (others ?? []).map((o) => o.id);
  const [{ data: parts }, { data: otherMatches }] = await Promise.all([
    match
      ? admin
          .from("participations")
          .select("id, player_id, seat_number, eliminated_at")
          .eq("match_id", match.id)
          .is("eliminated_at", null)
          .order("seat_number", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; player_id: string; seat_number: number | null; eliminated_at: string | null }[] }),
    otherIds.length > 0
      ? admin
          .from("matches")
          .select("id, physical_table_id, state")
          .in("physical_table_id", otherIds)
          .in("state", ["JOGANDO", "PAUSADA", "LIVRE"])
      : Promise.resolve({ data: [] as { id: string; physical_table_id: string; state: string }[] }),
  ]);

  // 4) Em paralelo: players (pros nomes da mesa atual) + parts (pra contagem das outras)
  const playerIds = (parts ?? []).map((p) => p.player_id);
  const otherMatchIds = (otherMatches ?? []).map((m) => m.id);
  const [{ data: playersList }, { data: otherParts }] = await Promise.all([
    playerIds.length > 0
      ? admin
          .from("players")
          .select("id, name, nickname, profile_id")
          .in("id", playerIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            nickname: string | null;
            profile_id: string | null;
          }[],
        }),
    otherMatchIds.length > 0
      ? admin
          .from("participations")
          .select("match_id")
          .in("match_id", otherMatchIds)
          .is("eliminated_at", null)
      : Promise.resolve({ data: [] as { match_id: string }[] }),
  ]);

  // Avatares: resolve profile_id → avatar_url
  const profileIds = (playersList ?? [])
    .map((p) => p.profile_id)
    .filter((id): id is string => id !== null);
  const avatarByProfile = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", profileIds);
    for (const p of profs ?? []) avatarByProfile.set(p.id, p.avatar_url);
  }

  const playersById = new Map<
    string,
    { name: string; nickname: string | null; avatarUrl: string | null }
  >();
  for (const p of playersList ?? []) {
    playersById.set(p.id, {
      name: p.name,
      nickname: p.nickname,
      avatarUrl: p.profile_id ? avatarByProfile.get(p.profile_id) ?? null : null,
    });
  }

  // V1.3: contagem de eliminações por player (mesma idéia do que a TV faz).
  // Restringe ao escopo do event_id desta mesa pra incluir kills feitos em
  // outra mesa do mesmo evento (caso o player troque de mesa, etc).
  const elimCounts = await (async (): Promise<Record<string, number>> => {
    const { data: evMatches } = await admin
      .from("matches")
      .select("id")
      .eq("event_id", table.event_id);
    const mIds = (evMatches ?? []).map((mm) => mm.id);
    if (mIds.length === 0) return {};
    const { data: elims } = await admin
      .from("participations")
      .select("eliminated_by_player_id")
      .in("match_id", mIds)
      .not("eliminated_by_player_id", "is", null);
    const acc: Record<string, number> = {};
    for (const e of elims ?? []) {
      const id = e.eliminated_by_player_id;
      if (!id) continue;
      acc[id] = (acc[id] ?? 0) + 1;
    }
    return acc;
  })();

  const seats: TableSeat[] = (parts ?? []).map((p) => {
    const player = playersById.get(p.player_id);
    return {
      participationId: p.id,
      playerId: p.player_id,
      seatNumber: p.seat_number,
      name: player?.name ?? "—",
      nickname: player?.nickname ?? null,
      isYou: p.player_id === myPlayer.id,
      avatarUrl: player?.avatarUrl ?? null,
      eliminationCount: elimCounts[p.player_id] ?? 0,
    };
  });

  const matchToTable = new Map<string, string>();
  for (const m of otherMatches ?? []) matchToTable.set(m.id, m.physical_table_id);
  const seatCounts = new Map<string, number>();
  for (const p of otherParts ?? []) {
    const tid = matchToTable.get(p.match_id);
    if (tid) seatCounts.set(tid, (seatCounts.get(tid) ?? 0) + 1);
  }

  const otherTables = (others ?? []).map((o) => ({
    id: o.id,
    tableNumber: o.table_number,
    state: o.state,
    seats: seatCounts.get(o.id) ?? 0,
  }));

  return {
    table,
    match: match ?? null,
    seats,
    eventId: event.id,
    eventName: event.name,
    otherTables,
  };
}

/**
 * V1.3 — Player se auto-elimina: fim do evento pra ele.
 * Espelha eliminatePlayer (matches.ts) mas usa privilegedClient + gate de identidade
 * em vez de requireAdmin.
 */
export async function eliminateSelf(
  input: { eventId?: string; eliminatedByPlayerId?: string | null } = {},
): Promise<{ finalPosition: number }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");
  // Tap acidental duplo já é coberto pela confirmação de 2 passos no UI
  // (mesa-view.tsx). Rate limit aqui mais atrapalha que ajuda — bloqueava
  // rebuy seguido de re-eliminação dentro da janela de 60s.
  // Dedup mínimo de 3s previne double-submit de fato.
  checkRateLimit(`eliminate-self:${userId}`, 1, 3_000);

  const admin = privilegedClient();

  let playerQuery = admin
    .from("players")
    .select("*")
    .eq("profile_id", userId)
    .eq("state", "JOGANDO");
  if (input.eventId) playerQuery = playerQuery.eq("event_id", input.eventId);

  const { data: player } = await playerQuery.limit(1).maybeSingle();
  if (!player) throw new Error("Você não está em nenhuma partida ativa.");

  const { data: participation } = await admin
    .from("participations")
    .select("id, match_id, eliminated_at")
    .eq("player_id", player.id)
    .is("eliminated_at", null)
    .limit(1)
    .maybeSingle();
  if (!participation) throw new Error("Sem participação ativa.");

  const { data: match } = await admin
    .from("matches")
    .select("id, event_id, state")
    .eq("id", participation.match_id)
    .maybeSingle();
  if (!match) throw new Error("Partida não encontrada.");
  if (match.state === "FINALIZADA") {
    throw new Error("Partida já finalizada.");
  }

  // Valida eliminatedByPlayerId: precisa estar na mesma mesa, sem ser o próprio
  let eliminatedById: string | null = null;
  if (input.eliminatedByPlayerId) {
    if (input.eliminatedByPlayerId === player.id) {
      throw new Error("Você não pode se auto-eliminar.");
    }
    const { data: killerPart } = await admin
      .from("participations")
      .select("player_id")
      .eq("match_id", match.id)
      .eq("player_id", input.eliminatedByPlayerId)
      .is("eliminated_at", null)
      .maybeSingle();
    if (killerPart) eliminatedById = input.eliminatedByPlayerId;
    // Se não estiver na mesa, ignora silenciosamente (não bloqueia eliminação)
  }

  // final_position na MESA = quantos ainda estão na mesa (incluindo este)
  const { count: tableActive } = await admin
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("match_id", match.id)
    .is("eliminated_at", null);
  const tableFinalPosition = tableActive ?? 1;

  // final_position no EVENTO = quantos ainda estão JOGANDO no evento (incluindo este)
  const { count: eventActive } = await admin
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("event_id", match.event_id)
    .eq("state", "JOGANDO");
  const eventFinalPosition = eventActive ?? tableFinalPosition;

  const now = new Date().toISOString();

  const { error: pErr } = await admin
    .from("participations")
    .update({
      eliminated_at: now,
      final_position: tableFinalPosition,
      eliminated_by_player_id: eliminatedById,
    })
    .eq("id", participation.id);
  if (pErr) throw new Error(`Erro ao registrar eliminação: ${pErr.message}`);

  const { error: plErr } = await admin
    .from("players")
    .update({
      state: "ELIMINADO",
      final_position: eventFinalPosition,
      has_paid_buyin: false, // V1.3: precisa rebuy pra voltar
    })
    .eq("id", player.id);
  if (plErr) throw new Error(`Erro ao atualizar player: ${plErr.message}`);

  // V1.3: SEM coroação automática. Admin define o campeão manualmente
  // via crownChampion() na página do evento.

  revalidatePath("/me");
  revalidatePath(`/admin/events/${match.event_id}`);
  revalidatePath(`/tv/${match.event_id}`);

  return { finalPosition: eventFinalPosition };
}

/**
 * V1.3 — Player troca de mesa SEM ser eliminado.
 * Leave atomicamente: deleta participation atual, entra na mesa nova.
 * Se a entrada falhar, o player fica PRESENTE (sem mesa) — pode tentar de novo do /me.
 */
export async function switchToTable(
  newPhysicalTableId: string,
  fromEventId?: string,
): Promise<{ matchId: string }> {
  // V1.3: passa eventId pra desambiguar caso user tenha múltiplos JOGANDO
  // em eventos diferentes (admin testando, etc).
  await leaveCurrentTable(fromEventId);
  return joinTableAsPlayer(newPhysicalTableId);
}

/**
 * V1.3 — Player solicita "mostrar fichas" na TV.
 * Insere chip_displays; TV subscreve a inserts e renderiza overlay por 15s.
 * Rate-limit: 1 display por player por 8 segundos pra evitar spam.
 *
 * IMPORTANTE: recebe `tableId` (physical_table_id). Se o user tem players
 * JOGANDO em múltiplos eventos (admin testando), filtrar só por profile_id
 * + state="JOGANDO" pega aleatoriamente um → display ia pro evento errado e
 * a TV nunca via. Filtrando por event_id desse table resolve.
 */
export async function requestChipDisplay(input: {
  amount: number;
  tableId: string;
}): Promise<void> {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw new Error("Valor de fichas inválido.");
  }
  if (input.amount > 10_000_000) {
    throw new Error("Valor exagerado.");
  }
  if (!input.tableId) throw new Error("Mesa não informada.");

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");
  checkRateLimit(`chip-display-fast:${userId}`, 1, 8_000);
  checkRateLimit(`chip-display-slow:${userId}`, 5, 60_000);

  const admin = privilegedClient();

  const { data: tableRow } = await admin
    .from("physical_tables")
    .select("event_id")
    .eq("id", input.tableId)
    .maybeSingle();
  if (!tableRow) throw new Error("Mesa não encontrada.");

  // Acha o player desse profile NESSE evento (não filtra por state — pra perfis
  // antigos com state legado/dessincronizado, conferimos a presença real via
  // participation em vez de state="JOGANDO").
  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("profile_id", userId)
    .eq("event_id", tableRow.event_id)
    .maybeSingle();
  if (!player) throw new Error("Você não está nesse evento.");

  // Confirma que o player está realmente sentado na mesa via participation ativa.
  const { data: match } = await admin
    .from("matches")
    .select("id")
    .eq("physical_table_id", input.tableId)
    .in("state", ["JOGANDO", "PAUSADA"])
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!match) throw new Error("Mesa não tem partida ativa.");

  const { data: part } = await admin
    .from("participations")
    .select("id")
    .eq("match_id", match.id)
    .eq("player_id", player.id)
    .is("eliminated_at", null)
    .maybeSingle();
  if (!part) throw new Error("Você não está nessa mesa agora.");

  const { error } = await admin.from("chip_displays").insert({
    event_id: tableRow.event_id,
    player_id: player.id,
    amount: input.amount,
  });
  if (error) throw new Error(`Erro ao mostrar fichas: ${error.message}`);

  revalidatePath(`/tv/${tableRow.event_id}`);
}
