import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { EventTV } from "@/components/tv/event-tv";
import { EmptyTV } from "@/components/tv/empty-tv";
import { getEliminationCounts } from "@/lib/tournament/eliminations";
import type { Database, Tables } from "@/lib/types/database.types";

export const metadata = {
  title: "TV · Poker Pi",
};

export default async function TVPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: event }, { data: tables }, { data: matches }, { data: levels }, { data: players }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase
        .from("physical_tables")
        .select("*")
        .eq("event_id", eventId)
        .order("table_number", { ascending: true }),
      supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId)
        .order("match_number", { ascending: true }),
      supabase.from("blind_levels").select("*").eq("event_id", eventId),
      supabase
        .from("players")
        .select("*")
        .eq("event_id", eventId),
    ]);

  // Evento inexistente OU soft-deletado → TV neutra "Sem nenhum evento".
  // (Não retornamos 404 porque a TV deve ficar acesa pro próximo evento.)
  if (!event || event.deleted_at) {
    return <EmptyTV reason={event?.deleted_at ? "deleted" : "missing"} />;
  }

  // V1.3: participações ativas + avatares de profile (via service_role, pois
  // TV é anônima e a policy de profiles exige auth.uid()).
  const activeMatchIds = (matches ?? [])
    .filter((m) => m.state !== "FINALIZADA")
    .map((m) => m.id);

  const profileIds = (players ?? [])
    .map((p) => p.profile_id)
    .filter((id): id is string => id !== null);

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      )
    : null;

  const [{ data: participations }, { data: profilesAvatars }] = await Promise.all([
    activeMatchIds.length
      ? supabase
          .from("participations")
          .select("*")
          .in("match_id", activeMatchIds)
          .is("eliminated_at", null)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Tables<"participations">[] }),
    profileIds.length && adminClient
      ? adminClient.from("profiles").select("id, avatar_url").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[] }),
  ]);

  const avatarByProfile: Record<string, string | null> = {};
  for (const p of profilesAvatars ?? []) avatarByProfile[p.id] = p.avatar_url;

  const eliminationCounts = await getEliminationCounts(eventId);

  return (
    <EventTV
      event={event}
      initialTables={tables ?? []}
      initialMatches={matches ?? []}
      levels={levels ?? []}
      initialPlayers={players ?? []}
      initialParticipations={participations ?? []}
      avatarByProfile={avatarByProfile}
      initialEliminationCounts={eliminationCounts}
    />
  );
}
