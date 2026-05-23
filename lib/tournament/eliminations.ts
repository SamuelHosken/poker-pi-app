import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * V1.3 — Conta eliminações por player no escopo de um evento.
 * Roda no SSR da TV/mesa pra hidratar o estado inicial. O contador segue
 * incrementando no client via Realtime quando chega `eliminated_by_player_id`
 * em INSERT/UPDATE de `participations`.
 *
 * Usa service_role pra ler `participations` mesmo em rotas anônimas (TV).
 */
export async function getEliminationCounts(
  eventId: string,
): Promise<Record<string, number>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data: matches } = await admin
    .from("matches")
    .select("id")
    .eq("event_id", eventId);
  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return {};

  const { data: parts } = await admin
    .from("participations")
    .select("eliminated_by_player_id")
    .in("match_id", matchIds)
    .not("eliminated_by_player_id", "is", null);

  const counts: Record<string, number> = {};
  for (const p of parts ?? []) {
    const id = p.eliminated_by_player_id;
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
