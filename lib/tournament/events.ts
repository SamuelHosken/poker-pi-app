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
import type { EventState } from "@/lib/types/domain";
import type { Tables, Inserts } from "@/lib/types/database.types";

type Event = Tables<"events">;
type BlindLevel = Tables<"blind_levels">;
type PhysicalTable = Tables<"physical_tables">;

async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Você precisa estar autenticado.");
  return { userId: user.id };
}

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

  // Insere as mesas físicas e os níveis de blind. Se qualquer um falhar,
  // deletamos o evento pra evitar estado parcial.
  try {
    const template = getBlindTemplate(data.blindTemplate);

    const blindRows: Inserts<"blind_levels">[] = template.levels.map((lvl) => ({
      event_id: event.id,
      level_number: lvl.level,
      small_blind: lvl.smallBlind,
      big_blind: lvl.bigBlind,
      ante: lvl.ante,
      duration_minutes: lvl.durationMinutes,
      is_final_table: false,
    }));

    const tableRows: Inserts<"physical_tables">[] = Array.from(
      { length: data.numberOfPhysicalTables },
      (_, i) => ({
        event_id: event.id,
        table_number: i + 1,
      }),
    );

    const [{ error: blindError }, { error: tableError }] = await Promise.all([
      supabase.from("blind_levels").insert(blindRows),
      supabase.from("physical_tables").insert(tableRows),
    ]);

    if (blindError) throw new Error(`Falha ao criar estrutura de blinds: ${blindError.message}`);
    if (tableError) throw new Error(`Falha ao criar mesas físicas: ${tableError.message}`);
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

export async function listEvents(): Promise<Event[]> {
  const { userId } = await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("admin_user_id", userId)
    .order("event_date", { ascending: false });

  if (error) throw new Error(`Erro ao listar eventos: ${error.message}`);
  return data ?? [];
}

export async function deleteEvent(id: string): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: event } = await supabase
    .from("events")
    .select("state")
    .eq("id", id)
    .maybeSingle();

  if (!event) throw new Error("Evento não encontrado.");
  if (event.state !== "SETUP") {
    throw new Error("Só é possível apagar eventos no estado SETUP.");
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(`Erro ao apagar evento: ${error.message}`);

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
