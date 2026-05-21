"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/lib/types/database.types";

type Player = Tables<"players">;

/**
 * Retorna jogadores em estado PRESENTE do evento, ordenados por chegada
 * (created_at ascendente — FIFO).
 */
export async function getQueue(eventId: string): Promise<Player[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .eq("state", "PRESENTE")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Erro ao ler fila: ${error.message}`);
  return data ?? [];
}
