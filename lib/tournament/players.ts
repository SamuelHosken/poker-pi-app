"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import { CreatePlayerSchema } from "@/lib/types/schemas";
import type { Tables, Inserts } from "@/lib/types/database.types";

type Player = Tables<"players">;

/**
 * Cadastra um novo jogador no evento, já marcado como PRESENTE.
 * Gera token único de 12 caracteres pra URL /player/[token].
 */
export async function createPlayer(input: unknown): Promise<{ id: string; token: string }> {
  const data = CreatePlayerSchema.parse(input);
  await requireAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const token = nanoid(12);
  const insert: Inserts<"players"> = {
    event_id: data.eventId,
    name: data.name,
    nickname: data.nickname ?? null,
    phone: data.phone ?? null,
    player_token: token,
    state: "PRESENTE",
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
