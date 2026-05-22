"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { CreatePlayerSchema } from "@/lib/types/schemas";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";

type Player = Tables<"players">;
type Profile = Tables<"profiles">;

/**
 * V1.2 — Cadastra um novo jogador no evento.
 *
 * Modo recomendado (V1.2): passar `profileId` — name/nickname são puxados
 * do profile cadastrado. Garante que a pessoa pode fazer login depois.
 *
 * Modo legado (convidado avulso): passar `name`/`nickname` direto, sem profileId.
 * Mantido pra back-compat. Esse player não vai conseguir fazer login.
 *
 * Sempre gera player_token (coluna NOT NULL UNIQUE no schema).
 */
export async function createPlayer(input: unknown): Promise<{ id: string; token: string }> {
  const data = CreatePlayerSchema.parse(input);
  await requireAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let resolvedName = data.name;
  let resolvedNickname = data.nickname ?? null;

  // Se profileId foi fornecido, puxa dados do profile (ignora name/nickname do input)
  if (data.profileId) {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("name, nickname")
      .eq("id", data.profileId)
      .maybeSingle();
    if (profileErr) throw new Error(`Erro ao ler perfil: ${profileErr.message}`);
    if (!profile) throw new Error("Perfil não encontrado.");
    resolvedName = profile.name;
    resolvedNickname = profile.nickname ?? null;

    // Garante que profile não está duplicado no mesmo evento
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("event_id", data.eventId)
      .eq("profile_id", data.profileId)
      .maybeSingle();
    if (existing) {
      throw new Error(`${resolvedName} já está cadastrado neste evento.`);
    }
  }

  const token = nanoid(12);
  const insert: Inserts<"players"> = {
    event_id: data.eventId,
    name: resolvedName,
    nickname: resolvedNickname,
    phone: data.phone ?? null,
    player_token: token,
    state: "PRESENTE",
    profile_id: data.profileId ?? null,
  };

  const { data: player, error } = await supabase
    .from("players")
    .insert(insert)
    .select()
    .single();

  if (error || !player) {
    throw new Error(`Não foi possível cadastrar jogador: ${error?.message ?? "erro desconhecido"}`);
  }

  revalidatePath(`/admin/events/${data.eventId}`);
  return { id: player.id, token };
}

/**
 * V1.2 — Lista perfis cadastrados que AINDA NÃO estão no evento.
 * Útil pra o dropdown de "adicionar pessoa".
 */
export async function listProfilesAvailableForEvent(
  eventId: string,
): Promise<Profile[]> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: profiles }, { data: players }] = await Promise.all([
    supabase.from("profiles").select("*").order("name", { ascending: true }),
    supabase
      .from("players")
      .select("profile_id")
      .eq("event_id", eventId)
      .not("profile_id", "is", null),
  ]);

  const alreadyIn = new Set((players ?? []).map((p) => p.profile_id));
  return (profiles ?? []).filter((p) => !alreadyIn.has(p.id));
}

/**
/**
 * V1.3 — Admin marca/desmarca pagamento de buy-in (ou rebuy).
 * Toggle `has_paid_buyin`. Quando true, player pode entrar em mesa.
 * Eliminação zera o flag (precisa marcar rebuy pra voltar a jogar).
 */
export async function markPlayerPaid(input: {
  playerId: string;
  paid: boolean;
}): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: player } = await supabase
    .from("players")
    .select("id, event_id, has_paid_buyin")
    .eq("id", input.playerId)
    .maybeSingle();
  if (!player) throw new Error("Jogador não encontrado.");

  const { error } = await supabase
    .from("players")
    .update({ has_paid_buyin: input.paid })
    .eq("id", input.playerId);
  if (error) throw new Error(`Erro ao marcar pago: ${error.message}`);

  revalidatePath(`/admin/events/${player.event_id}`);
  revalidatePath(`/admin/events/${player.event_id}/tv`);
  revalidatePath("/me");
}

/**
 * V1.2 — Remove um jogador do evento (apaga a row em players, cascateia
 * participações). Só permite quando o player ainda não jogou
 * (state INSCRITO ou PRESENTE) — players que já passaram por JOGANDO/
 * ELIMINADO/CAMPEAO etc. têm histórico no action_log e não devem ser apagados.
 */
export async function removePlayerFromEvent(playerId: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("id, event_id, name, state")
    .eq("id", playerId)
    .maybeSingle();
  if (pErr) throw new Error(`Erro ao buscar jogador: ${pErr.message}`);
  if (!player) throw new Error("Jogador não encontrado.");

  if (player.state !== "INSCRITO" && player.state !== "PRESENTE") {
    throw new Error(
      `Só dá pra remover quem ainda não jogou. ${player.name} está em estado ${player.state}.`,
    );
  }

  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw new Error(`Erro ao remover ${player.name}: ${error.message}`);

  revalidatePath(`/admin/events/${player.event_id}`);
}

/**
 * Lista todos os jogadores de um evento (ordenados por chegada).
 */
export async function listPlayersForEvent(eventId: string): Promise<Player[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Erro ao listar jogadores: ${error.message}`);
  return data ?? [];
}
