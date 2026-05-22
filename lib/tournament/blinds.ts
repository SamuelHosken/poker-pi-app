"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";

type BlindLevel = Tables<"blind_levels">;

type BlindInput = {
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
};

function validate(input: BlindInput) {
  if (!Number.isInteger(input.smallBlind) || input.smallBlind < 0) {
    throw new Error("Small blind inválido.");
  }
  if (!Number.isInteger(input.bigBlind) || input.bigBlind < 0) {
    throw new Error("Big blind inválido.");
  }
  if (!Number.isInteger(input.ante) || input.ante < 0) {
    throw new Error("Ante inválido.");
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error("Duração deve ser > 0 minutos.");
  }
}

/**
 * V1.3 — Adiciona um nível de blind no fim da estrutura da mesa.
 * level_number é calculado como max + 1.
 */
export async function createBlindLevel(input: {
  physicalTableId: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
}): Promise<{ id: string }> {
  validate(input);
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: table, error: tErr } = await supabase
    .from("physical_tables")
    .select("id, event_id")
    .eq("id", input.physicalTableId)
    .maybeSingle();
  if (tErr) throw new Error(`Erro ao ler mesa: ${tErr.message}`);
  if (!table) throw new Error("Mesa não encontrada.");

  const { data: last } = await supabase
    .from("blind_levels")
    .select("level_number")
    .eq("physical_table_id", input.physicalTableId)
    .eq("is_final_table", false)
    .order("level_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextLevelNumber = (last?.level_number ?? 0) + 1;

  const insert: Inserts<"blind_levels"> = {
    event_id: table.event_id,
    physical_table_id: input.physicalTableId,
    level_number: nextLevelNumber,
    small_blind: input.smallBlind,
    big_blind: input.bigBlind,
    ante: input.ante,
    duration_minutes: input.durationMinutes,
    is_final_table: false,
  };

  const { data: created, error } = await supabase
    .from("blind_levels")
    .insert(insert)
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`Erro ao criar nível: ${error?.message ?? "desconhecido"}`);
  }

  revalidatePath(`/admin/events/${table.event_id}/tv`);
  revalidatePath(`/admin/events/${table.event_id}`);
  revalidatePath(`/tv/${table.event_id}`);
  return { id: created.id };
}

/**
 * V1.3 — Edita um nível existente (SB/BB/Ante/Duração).
 * level_number não é editável aqui — pra reordenar, apaga + cria.
 */
export async function updateBlindLevel(input: {
  blindLevelId: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
}): Promise<void> {
  validate(input);
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: level, error: rErr } = await supabase
    .from("blind_levels")
    .select("id, event_id")
    .eq("id", input.blindLevelId)
    .maybeSingle();
  if (rErr) throw new Error(`Erro ao ler nível: ${rErr.message}`);
  if (!level) throw new Error("Nível não encontrado.");

  const { error } = await supabase
    .from("blind_levels")
    .update({
      small_blind: input.smallBlind,
      big_blind: input.bigBlind,
      ante: input.ante,
      duration_minutes: input.durationMinutes,
    })
    .eq("id", input.blindLevelId);
  if (error) throw new Error(`Erro ao atualizar nível: ${error.message}`);

  revalidatePath(`/admin/events/${level.event_id}/tv`);
  revalidatePath(`/admin/events/${level.event_id}`);
  revalidatePath(`/tv/${level.event_id}`);
}

/**
 * V1.3 — Remove um nível. Bloqueia se for o nível atual de alguma partida ativa.
 */
export async function deleteBlindLevel(blindLevelId: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: level } = await supabase
    .from("blind_levels")
    .select("id, event_id, level_number, physical_table_id, is_final_table")
    .eq("id", blindLevelId)
    .maybeSingle();
  if (!level) throw new Error("Nível não encontrado.");

  const { data: usedBy } = await supabase
    .from("matches")
    .select("id, state")
    .eq("current_level_id", blindLevelId)
    .neq("state", "FINALIZADA");
  if (usedBy && usedBy.length > 0) {
    throw new Error(
      "Esse nível está em uso por uma partida ativa. Avance o nível primeiro.",
    );
  }

  const { error } = await supabase.from("blind_levels").delete().eq("id", blindLevelId);
  if (error) throw new Error(`Erro ao remover nível: ${error.message}`);

  revalidatePath(`/admin/events/${level.event_id}/tv`);
  revalidatePath(`/admin/events/${level.event_id}`);
  revalidatePath(`/tv/${level.event_id}`);
}

/**
 * V1.3 — Lista blinds de uma mesa específica (ordenado por level_number).
 */
export async function listBlindsForTable(physicalTableId: string): Promise<BlindLevel[]> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("blind_levels")
    .select("*")
    .eq("physical_table_id", physicalTableId)
    .eq("is_final_table", false)
    .order("level_number", { ascending: true });
  if (error) throw new Error(`Erro ao listar blinds: ${error.message}`);
  return data ?? [];
}
