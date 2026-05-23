import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type ActionLogPayload = {
  type?: string;
  eliminatedByPlayerId?: string | null;
};

/**
 * V1.3 — Conta eliminações por player no escopo de um evento.
 *
 * Lê do `action_log` (tipo ELIMINATE_PLAYER, com `eliminatedByPlayerId` no
 * payload) em vez de `participations.eliminated_by_player_id`. Motivo:
 * quando o player faz rebuy + join, a coluna na participation é resetada,
 * e o killer "perdia" a kill no contador. action_log é histórico
 * append-only — re-eliminações somam corretamente.
 *
 * Ignora ações revertidas (reverted_at != null).
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

  const { data: rows } = await admin
    .from("action_log")
    .select("payload, reverted_at")
    .eq("event_id", eventId)
    .eq("action_type", "ELIMINATE_PLAYER")
    .is("reverted_at", null);

  const counts: Record<string, number> = {};
  for (const r of rows ?? []) {
    const payload = r.payload as ActionLogPayload;
    const killer = payload?.eliminatedByPlayerId;
    if (!killer) continue;
    counts[killer] = (counts[killer] ?? 0) + 1;
  }
  return counts;
}
