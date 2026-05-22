"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/tournament/auth";
import type { Database } from "@/lib/types/database.types";

export type Champion = {
  playerId: string;
  eventId: string;
  playerName: string;
  nickname: string | null;
  avatarUrl: string | null;
  eventName: string;
  eventDate: string;
  rebuysUsed: number;
};

/**
 * V1.3 — Lista todos os campeões históricos (state=CAMPEAO).
 * Cruza com profiles pra puxar avatar_url. Eventos deletados são filtrados.
 */
export async function listChampions(): Promise<Champion[]> {
  await requireAdmin();

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1) Players state=CAMPEAO
  const { data: champPlayers } = await admin
    .from("players")
    .select("id, event_id, name, nickname, profile_id, rebuys_used")
    .eq("state", "CAMPEAO");

  if (!champPlayers || champPlayers.length === 0) return [];

  const eventIds = Array.from(new Set(champPlayers.map((p) => p.event_id)));
  const profileIds = champPlayers
    .map((p) => p.profile_id)
    .filter((id): id is string => id !== null);

  const [{ data: events }, { data: profiles }] = await Promise.all([
    admin
      .from("events")
      .select("id, name, event_date, deleted_at")
      .in("id", eventIds),
    profileIds.length > 0
      ? admin.from("profiles").select("id, avatar_url").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[] }),
  ]);

  const eventsById = new Map((events ?? []).map((e) => [e.id, e]));
  const avatarByProfile = new Map(
    (profiles ?? []).map((p) => [p.id, p.avatar_url] as const),
  );

  return champPlayers
    .map<Champion | null>((p) => {
      const e = eventsById.get(p.event_id);
      if (!e || e.deleted_at) return null; // ignora eventos deletados
      return {
        playerId: p.id,
        eventId: p.event_id,
        playerName: p.name,
        nickname: p.nickname,
        avatarUrl: p.profile_id ? avatarByProfile.get(p.profile_id) ?? null : null,
        eventName: e.name,
        eventDate: e.event_date,
        rebuysUsed: p.rebuys_used,
      };
    })
    .filter((c): c is Champion => c !== null)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));
}
