"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * V1.1 — Mesa final foi removida como fase do produto.
 *
 * Este arquivo permanece pra manter compatibilidade de imports e exports
 * (caso código antigo referencie `transitionToFinalTable`/`startFinalMatch`).
 *
 * Todas as funções abaixo agora lançam erro ou retornam "indisponível".
 * Eventos antigos com event.state = MESA_FINAL continuam visíveis no
 * histórico, mas não podem ser criados/avançados novos.
 */

export type FinalTableEligibility = {
  canTransition: boolean;
  reason?: string;
  classifiedCount: number;
  queueCount: number;
  activeMatchCount: number;
};

export async function canTransitionToFinalTable(
  eventId: string,
): Promise<FinalTableEligibility> {
  // Contagens ainda podem ser úteis em UIs legadas — preserva, mas força
  // canTransition=false e razão clara.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [classifiedRes, queueRes, activeRes] = await Promise.all([
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

  return {
    canTransition: false,
    reason: "Mesa final removida em V1.1. Use detectChampionAndEndEvent.",
    classifiedCount: classifiedRes.count ?? 0,
    queueCount: queueRes.count ?? 0,
    activeMatchCount: activeRes.count ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function transitionToFinalTable(_eventId: string): Promise<{ matchId: string }> {
  throw new Error(
    "Mesa final removida em V1.1. Use detectChampionAndEndEvent (chamada automaticamente pelo eliminatePlayer).",
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function startFinalMatch(_matchId: string): Promise<void> {
  throw new Error("startFinalMatch removida em V1.1. Não há mais mesa final.");
}
