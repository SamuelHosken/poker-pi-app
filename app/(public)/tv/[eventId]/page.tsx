import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { EventTV } from "@/components/tv/event-tv";

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

  if (!event) notFound();

  return (
    <EventTV
      event={event}
      initialTables={tables ?? []}
      initialMatches={matches ?? []}
      levels={levels ?? []}
      initialPlayers={players ?? []}
    />
  );
}
