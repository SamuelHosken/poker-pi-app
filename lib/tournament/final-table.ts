"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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
