"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/lib/types/database.types";
import { MatchCard } from "./match-card";

type Event = Tables<"events">;
type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;
type Player = Tables<"players">;

const STATE_LABEL: Record<string, string> = {
  SETUP: "Setup",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

export function EventTV({
  event: initialEvent,
  initialTables,
  initialMatches,
  levels,
  initialPlayers,
}: {
  event: Event;
  initialTables: PhysicalTable[];
  initialMatches: Match[];
  levels: BlindLevel[];
  initialPlayers: Player[];
}) {
  const [event, setEvent] = useState(initialEvent);
  const [tables, setTables] = useState(initialTables);
  const [matches, setMatches] = useState(initialMatches);
  const [players, setPlayers] = useState(initialPlayers);

  const levelsById = useMemo(() => {
    const m: Record<string, BlindLevel> = {};
    for (const lvl of levels) m[lvl.id] = lvl;
    return m;
  }, [levels]);

  // Realtime: event + tables + matches + players
  useEffect(() => {
    const supabase = createClient();
    const filter = `event_id=eq.${event.id}`;

    const channel = supabase
      .channel(`tv-${event.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${event.id}` },
        (payload) => setEvent(payload.new as Event),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "physical_tables", filter },
        (payload) => {
          setTables((prev) => upsertById(prev, payload.new as PhysicalTable, payload.eventType));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter },
        (payload) => {
          setMatches((prev) => upsertById(prev, payload.new as Match, payload.eventType));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter },
        (payload) => {
          setPlayers((prev) => upsertById(prev, payload.new as Player, payload.eventType));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  const activeMatchByTable = useMemo(() => {
    const map: Record<string, Match | undefined> = {};
    for (const t of tables) {
      const m = matches.find(
        (mm) => mm.physical_table_id === t.id && mm.state !== "FINALIZADA",
      );
      map[t.id] = m;
    }
    return map;
  }, [tables, matches]);

  const presentes = players.filter((p) => p.state === "PRESENTE").length;
  const classificados = players.filter(
    (p) => p.state === "CLASSIFICADO" || p.state === "NA_FINAL",
  );

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      <header className="flex items-baseline justify-between border-b border-line px-10 py-5">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Poker Pi
          </span>
          <h1 className="mt-1 font-display text-3xl font-light tracking-tight">{event.name}</h1>
        </div>
        <span className="rounded-full border border-line px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-gold">
          {STATE_LABEL[event.state] ?? event.state}
        </span>
      </header>

      <section className="flex-1 grid auto-rows-fr gap-6 p-10 lg:grid-cols-2">
        {tables.map((t) => (
          <MatchCard
            key={t.id}
            table={t}
            match={activeMatchByTable[t.id]}
            level={
              activeMatchByTable[t.id]?.current_level_id
                ? levelsById[activeMatchByTable[t.id]!.current_level_id!]
                : undefined
            }
          />
        ))}
      </section>

      <footer className="border-t border-line px-10 py-4 flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-gray-soft">
        <span>Na fila: <span className="text-paper">{presentes}</span></span>
        <span>Classificados: <span className="text-gold">{classificados.length}</span></span>
      </footer>
    </div>
  );
}

function upsertById<T extends { id: string }>(
  list: T[],
  next: T,
  eventType: "INSERT" | "UPDATE" | "DELETE" | string,
): T[] {
  if (eventType === "DELETE") {
    return list.filter((x) => x.id !== next.id);
  }
  const idx = list.findIndex((x) => x.id === next.id);
  if (idx === -1) return [...list, next];
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
