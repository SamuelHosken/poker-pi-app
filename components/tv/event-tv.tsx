"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/lib/types/database.types";
import { playSound } from "@/lib/audio/play-sound";
import { MatchCard } from "./match-card";
import {
  EliminationToast,
  type EliminationToastData,
} from "./elimination-toast";
import {
  MatchFinishCelebration,
  type CelebrationData,
} from "./match-finish-celebration";
import { Podium } from "./podium";
import { AnimatedNewMatch, type NewMatchData } from "./new-match-overlay";
import { SoundToggle } from "./sound-toggle";

type Event = Tables<"events">;
type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;
type Player = Tables<"players">;
type Participation = Tables<"participations">;

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

  const [toasts, setToasts] = useState<EliminationToastData[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [newMatch, setNewMatch] = useState<NewMatchData | null>(null);

  const levelsById = useMemo(() => {
    const m: Record<string, BlindLevel> = {};
    for (const lvl of levels) m[lvl.id] = lvl;
    return m;
  }, [levels]);

  // Refs com state atual pra acesso dentro dos handlers de subscription
  // (que capturam closure no momento da inscrição).
  const playersRef = useRef(initialPlayers);
  const tablesRef = useRef(initialTables);
  const matchesRef = useRef(initialMatches);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // Refs de dedup pra eventos que disparam ações visuais (toast/celebração).
  const seenEliminations = useRef<Set<string>>(new Set());
  const seenFinishes = useRef<Set<string>>(new Set());
  const seenNewMatches = useRef<Set<string>>(new Set());
  // Pré-popula com FINALIZADAs já existentes — evita celebração ao montar.
  // Pré-popula matches existentes — evita sorteio ao reabrir TV.
  useEffect(() => {
    for (const m of initialMatches) {
      if (m.state === "FINALIZADA") seenFinishes.current.add(m.id);
      seenNewMatches.current.add(m.id);
    }
  }, [initialMatches]);

  const playersById = useMemo(() => {
    const m = new Map<string, { name: string; nickname: string | null }>();
    for (const p of players) m.set(p.id, { name: p.name, nickname: p.nickname });
    return m;
  }, [players]);

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
          const next = payload.new as Match;
          setMatches((prev) => upsertById(prev, next, payload.eventType));

          // Nova partida → sorteio animado (uma vez por match)
          if (payload.eventType === "INSERT" && !seenNewMatches.current.has(next.id)) {
            seenNewMatches.current.add(next.id);
            const ptable = tablesRef.current.find((tt) => tt.id === next.physical_table_id);
            if (ptable) {
              setNewMatch({
                matchId: next.id,
                tableNumber: ptable.table_number,
                isFinalTable: next.is_final_table,
              });
            }
          }

          if (
            payload.eventType === "UPDATE" &&
            next.state === "FINALIZADA" &&
            !seenFinishes.current.has(next.id) &&
            next.winner_player_id
          ) {
            seenFinishes.current.add(next.id);
            const winner = playersRef.current.find((pp) => pp.id === next.winner_player_id);
            const ptable = tablesRef.current.find((tt) => tt.id === next.physical_table_id);
            if (winner && ptable) {
              setCelebration({
                matchId: next.id,
                winnerName: winner.name,
                winnerNickname: winner.nickname,
                tableNumber: ptable.table_number,
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter },
        (payload) => {
          setPlayers((prev) => upsertById(prev, payload.new as Player, payload.eventType));
        },
      )
      // Participations não tem event_id, então filtramos no handler
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participations" },
        (payload) => {
          const p = payload.new as Participation;
          // Pertence ao nosso evento?
          const m = matchesRef.current.find((mm) => mm.id === p.match_id);
          if (!m) return;
          if (m.event_id !== event.id) return;

          if (!p.eliminated_at) return;
          if (seenEliminations.current.has(p.id)) return;

          // Filtra eliminações antigas (>30s) — caso de reconexão tardia
          const ageMs = Date.now() - new Date(p.eliminated_at).getTime();
          if (ageMs > 30_000) return;

          seenEliminations.current.add(p.id);

          const player = playersRef.current.find((pp) => pp.id === p.player_id);
          const ptable = tablesRef.current.find((tt) => tt.id === m.physical_table_id);
          if (!player || !ptable) return;

          playSound("elimination");
          setToasts((prev) => [
            ...prev,
            {
              id: p.id,
              playerName: player.name,
              nickname: player.nickname,
              finalPosition: p.final_position,
              tableNumber: ptable.table_number,
            },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

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

      {event.state === "ENCERRADO" ? (
        <section className="flex-1">
          <Podium players={players} />
        </section>
      ) : /* V1.1: MESA_FINAL layout mantido para compatibilidade com eventos
              criados antes de V1.1. Novos eventos vão direto EM_ANDAMENTO →
              ENCERRADO (via detectChampionAndEndEvent no eliminatePlayer). */
      event.state === "MESA_FINAL" ? (
        <section className="flex flex-1 items-center justify-center p-10">
          {(() => {
            const finalMatch = matches.find((m) => m.is_final_table);
            const finalTable = finalMatch
              ? tables.find((t) => t.id === finalMatch.physical_table_id)
              : undefined;
            if (!finalMatch || !finalTable) {
              return (
                <p className="font-display text-3xl italic text-gray-soft">
                  Aguardando montagem da Mesa Final…
                </p>
              );
            }
            return (
              <div className="w-full max-w-3xl">
                <MatchCard
                  table={finalTable}
                  match={finalMatch}
                  level={
                    finalMatch.current_level_id
                      ? levelsById[finalMatch.current_level_id]
                      : undefined
                  }
                />
              </div>
            );
          })()}
        </section>
      ) : (
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
      )}

      <footer className="border-t border-line px-10 py-4 flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-gray-soft">
        <span>
          Na fila: <span className="text-paper">{presentes}</span>
        </span>
        <span className="flex items-center gap-4 truncate">
          <span>
            Classificados: <span className="text-gold">{classificados.length}</span>
          </span>
          {classificados.length > 0 && (
            <span className="truncate font-display text-sm italic text-paper">
              {classificados.map((p) => p.nickname || p.name).join(" · ")}
            </span>
          )}
        </span>
      </footer>

      {/* Stack de toasts de eliminação */}
      <div className="pointer-events-none fixed right-6 top-6 z-40 flex flex-col gap-3">
        {toasts.map((t) => (
          <EliminationToast key={t.id} data={t} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Overlay de celebração quando uma mesa finaliza */}
      {celebration && (
        <MatchFinishCelebration
          key={celebration.matchId}
          data={celebration}
          onDone={() => setCelebration(null)}
        />
      )}

      {/* Sorteio animado quando uma nova partida começa */}
      <AnimatedNewMatch
        data={newMatch}
        playersById={playersById}
        onDone={() => setNewMatch(null)}
      />

      {/* Botão flutuante pra ativar som (autoplay policy) */}
      <SoundToggle />
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
