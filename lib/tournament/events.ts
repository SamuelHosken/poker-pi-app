"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  CreateEventSchema,
  type CreateEventInput,
  TransitionEventStateSchema,
} from "@/lib/types/schemas";
import { canTransitionEvent, transitionErrorMessage } from "@/lib/tournament/transitions";
import { getBlindTemplate } from "@/lib/tournament/blind-templates";
import { logAction } from "@/lib/tournament/action-log";
import { requireAdmin } from "@/lib/tournament/auth";
import type { EventState } from "@/lib/types/domain";
import type { Tables, TablesInsert as Inserts } from "@/lib/types/database.types";

type Event = Tables<"events">;
type BlindLevel = Tables<"blind_levels">;
type PhysicalTable = Tables<"physical_tables">;

/**
 * Cria um evento completo: events + blind_levels (do template) + physical_tables.
 * Se algum insert falhar após o evento criado, faz cleanup (best-effort).
 */
export async function createEvent(input: CreateEventInput): Promise<{ id: string }> {
  const data = CreateEventSchema.parse(input);
  const { userId } = await requireAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const eventInsert: Inserts<"events"> = {
    name: data.name,
    event_date: new Date(data.eventDate).toISOString(),
    buy_in_cents: data.buyInCents,
    rebuy_cents: data.rebuyCents ?? null,
    rebuy_limit_per_player: data.rebuyLimitPerPlayer,
    rebuy_until_level: data.rebuyUntilLevel,
    table_size: data.tableSize,
    number_of_physical_tables: data.numberOfPhysicalTables,
    admin_user_id: userId,
  };

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert(eventInsert)
    .select()
    .single();

  if (eventError || !event) {
    throw new Error(`Não foi possível criar o evento: ${eventError?.message ?? "erro desconhecido"}`);
  }

  // V1.3: mesas físicas primeiro (precisamos dos IDs), depois blinds × mesas.
  // Cada mesa começa com uma cópia do template — admin edita por mesa depois.
  try {
    const template = getBlindTemplate(data.blindTemplate);

    const tableRows: Inserts<"physical_tables">[] = Array.from(
      { length: data.numberOfPhysicalTables },
      (_, i) => ({
        event_id: event.id,
        table_number: i + 1,
      }),
    );

    const { data: tables, error: tableError } = await supabase
      .from("physical_tables")
      .insert(tableRows)
      .select("id");
    if (tableError) throw new Error(`Falha ao criar mesas físicas: ${tableError.message}`);
    if (!tables || tables.length === 0) throw new Error("Falha ao criar mesas físicas.");

    const blindRows: Inserts<"blind_levels">[] = tables.flatMap((t) =>
      template.levels.map((lvl) => ({
        event_id: event.id,
        physical_table_id: t.id,
        level_number: lvl.level,
        small_blind: lvl.smallBlind,
        big_blind: lvl.bigBlind,
        ante: lvl.ante,
        duration_minutes: lvl.durationMinutes,
        is_final_table: false,
      })),
    );

    const { error: blindError } = await supabase.from("blind_levels").insert(blindRows);
    if (blindError) throw new Error(`Falha ao criar estrutura de blinds: ${blindError.message}`);
  } catch (err) {
    await supabase.from("events").delete().eq("id", event.id);
    throw err;
  }

  revalidatePath("/admin/events");
  return { id: event.id };
}

export type EventDetail = {
  event: Event;
  blindLevels: BlindLevel[];
  physicalTables: PhysicalTable[];
};

export async function getEvent(id: string): Promise<EventDetail | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar evento: ${error.message}`);
  if (!event) return null;

  const [{ data: blindLevels }, { data: physicalTables }] = await Promise.all([
    supabase
      .from("blind_levels")
      .select("*")
      .eq("event_id", id)
      .order("is_final_table", { ascending: true })
      .order("level_number", { ascending: true }),
    supabase
      .from("physical_tables")
      .select("*")
      .eq("event_id", id)
      .order("table_number", { ascending: true }),
  ]);

  return {
    event,
    blindLevels: blindLevels ?? [],
    physicalTables: physicalTables ?? [],
  };
}

export async function listEvents(options?: {
  includeDeleted?: boolean;
}): Promise<Event[]> {
  const { userId } = await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("events")
    .select("*")
    .eq("admin_user_id", userId);
  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  const { data, error } = await query.order("event_date", { ascending: false });

  if (error) throw new Error(`Erro ao listar eventos: ${error.message}`);
  return data ?? [];
}

/**
 * V1.3 — Lista eventos apagados (lixeira). Só usado pela UI de restauração.
 */
export async function listDeletedEvents(): Promise<Event[]> {
  const { userId } = await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("admin_user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar lixeira: ${error.message}`);
  return data ?? [];
}

/**
 * V1.3 — Restaura evento da lixeira (zera deleted_at).
 */
export async function restoreEvent(id: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(`Erro ao restaurar evento: ${error.message}`);

  revalidatePath("/admin/events");
}

/**
 * V1.3 — Liga/desliga avanço automático de blinds. Quando on, a página do
 * admin (TV config) detecta expiração do cronômetro e chama advanceLevel
 * automaticamente após 2s de carência. Off = admin avança manualmente.
 */
export async function setAutoAdvanceBlinds(input: {
  eventId: string;
  enabled: boolean;
}): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("events")
    .update({ auto_advance_blinds: input.enabled })
    .eq("id", input.eventId);
  if (error) throw new Error(`Erro ao mudar modo: ${error.message}`);

  revalidatePath(`/admin/events/${input.eventId}/tv`);
  revalidatePath(`/admin/events/${input.eventId}`);
}

/**
 * V1.3 — Ativa/desativa o modo "pausa geral" da TV. Quando ativo, a TV
 * cobre tudo com um overlay grande mostrando logo do evento + mensagem.
 * `message=null` desativa.
 */
export async function setTvPausedMessage(input: {
  eventId: string;
  message: string | null;
}): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const trimmed = input.message?.trim();
  const final = trimmed && trimmed.length > 0 ? trimmed : null;

  const { error } = await supabase
    .from("events")
    .update({ tv_paused_message: final })
    .eq("id", input.eventId);
  if (error) throw new Error(`Erro ao atualizar pausa geral: ${error.message}`);

  revalidatePath(`/admin/events/${input.eventId}/tv`);
  revalidatePath(`/tv/${input.eventId}`);
}

/**
 * V1.3 — Soft delete: marca deleted_at. Dá pra restaurar via lixeira.
 * Não cascateia nada — todos os dados continuam intactos.
 */
export async function deleteEvent(id: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event } = await supabase
    .from("events")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!event) throw new Error("Evento não encontrado.");
  if (event.deleted_at) throw new Error("Evento já está na lixeira.");

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Erro ao apagar evento: ${error.message}`);

  revalidatePath("/admin/events");
}

/**
 * V1.3 — Apagar definitivamente (hard delete). Cascateia tudo. Só funciona
 * em eventos já na lixeira.
 */
export async function deleteEventPermanently(id: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event } = await supabase
    .from("events")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!event) throw new Error("Evento não encontrado.");
  if (!event.deleted_at) {
    throw new Error("Mova pra lixeira antes de apagar definitivamente.");
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(`Erro ao apagar definitivamente: ${error.message}`);

  revalidatePath("/admin/events");
}

export async function transitionEventState(input: unknown): Promise<void> {
  const { id, newState } = TransitionEventStateSchema.parse(input);
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("state")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(`Erro ao ler evento: ${fetchError.message}`);
  if (!event) throw new Error("Evento não encontrado.");

  const from = event.state as EventState;
  if (!canTransitionEvent(from, newState)) {
    throw new Error(transitionErrorMessage("evento", from, newState));
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({ state: newState })
    .eq("id", id);

  if (updateError) throw new Error(`Erro ao atualizar estado: ${updateError.message}`);

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
}

/**
 * V1.3 — Encerra o evento manualmente sem campeão (admin desistiu / pausou geral).
 * Pra coroar um campeão, use crownChampion(); ele já encerra o evento junto.
 */
export async function endEventManually(eventId: string): Promise<{ crownedChampionId: string | null }> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("state")
    .eq("id", eventId)
    .maybeSingle();
  if (eErr) throw new Error(`Erro ao ler evento: ${eErr.message}`);
  if (!event) throw new Error("Evento não encontrado.");
  if (event.state !== "EM_ANDAMENTO") {
    throw new Error(`Evento não está EM_ANDAMENTO (atual: ${event.state}).`);
  }

  const { error: upErr } = await supabase
    .from("events")
    .update({ state: "ENCERRADO" })
    .eq("id", eventId);
  if (upErr) throw new Error(`Erro ao encerrar evento: ${upErr.message}`);

  await logAction(supabase, eventId, {
    type: "EVENT_MANUALLY_ENDED",
    eventId,
    previousState: { state: "EM_ANDAMENTO" },
    crownedChampionId: null,
    previousChampionState: null,
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/tv/${eventId}`);
  return { crownedChampionId: null };
}

/**
 * V1.3 — Admin coroa um campeão manualmente. Ação única:
 *   - Marca o player escolhido como CAMPEAO + final_position=1
 *   - Encerra o evento (state=ENCERRADO)
 *   - Player aparece imediatamente na galeria histórica
 *
 * Se já houver outro CAMPEAO no evento, troca: o anterior vira ELIMINADO
 * com final_position=2 (admin pode ter errado e querer trocar).
 */
export async function crownChampion(input: {
  eventId: string;
  playerId: string;
}): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: event }, { data: player }] = await Promise.all([
    supabase.from("events").select("id, state").eq("id", input.eventId).maybeSingle(),
    supabase
      .from("players")
      .select("id, event_id, name")
      .eq("id", input.playerId)
      .maybeSingle(),
  ]);
  if (!event) throw new Error("Evento não encontrado.");
  if (!player) throw new Error("Jogador não encontrado.");
  if (player.event_id !== input.eventId) {
    throw new Error("Jogador não pertence a este evento.");
  }

  // Se já tem outro CAMPEAO, "destrona" ele primeiro
  const { data: previousChamp } = await supabase
    .from("players")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("state", "CAMPEAO")
    .neq("id", input.playerId)
    .maybeSingle();
  if (previousChamp) {
    await supabase
      .from("players")
      .update({ state: "ELIMINADO", final_position: 2 })
      .eq("id", previousChamp.id);
  }

  // Coroa o escolhido
  const { error: pErr } = await supabase
    .from("players")
    .update({ state: "CAMPEAO", final_position: 1 })
    .eq("id", input.playerId);
  if (pErr) throw new Error(`Erro ao coroar: ${pErr.message}`);

  // Fecha o evento se ainda não tava fechado
  if (event.state !== "ENCERRADO") {
    await supabase
      .from("events")
      .update({ state: "ENCERRADO" })
      .eq("id", input.eventId);
  }

  revalidatePath(`/admin/events/${input.eventId}`);
  revalidatePath(`/admin/galeria`);
  revalidatePath(`/tv/${input.eventId}`);
}
