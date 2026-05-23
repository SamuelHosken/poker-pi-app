"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/lib/types/database.types";
import { playSound } from "@/lib/audio/play-sound";
import { playSynth } from "@/lib/audio/synth";
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
import { SoundToggle } from "./sound-toggle";
import { ChipDisplayOverlay } from "./chip-display-overlay";
import { TvPausedOverlay } from "./tv-paused-overlay";
import { RealtimeStatus } from "./realtime-status";
import { useReactions } from "@/lib/realtime/use-reactions";
import { useAvatarRefresh } from "@/lib/realtime/avatar-broadcast";
import { EmptyTV } from "./empty-tv";
import type { PokerSeat } from "./poker-table";

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
  initialParticipations,
  avatarByProfile = {},
  initialEliminationCounts = {},
}: {
  event: Event;
  initialTables: PhysicalTable[];
  initialMatches: Match[];
  levels: BlindLevel[];
  initialPlayers: Player[];
  initialParticipations: Participation[];
  avatarByProfile?: Record<string, string | null>;
  initialEliminationCounts?: Record<string, number>;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [tables, setTables] = useState(initialTables);
  const [matches, setMatches] = useState(initialMatches);
  const [players, setPlayers] = useState(initialPlayers);
  const [participations, setParticipations] = useState(initialParticipations);
  // Contagem de eliminações por playerId. Incrementa via Realtime quando chega
  // participation com eliminated_by_player_id setado. Drives o "fogo".
  const [eliminationCounts, setEliminationCounts] = useState<
    Record<string, number>
  >(initialEliminationCounts);

  const [toasts, setToasts] = useState<EliminationToastData[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  // V1.3: IDs de seats em transição (entrada / saída) pra disparar animações
  const [enteringSeatIds, setEnteringSeatIds] = useState<Set<string>>(new Set());
  const [ghostSeats, setGhostSeats] = useState<
    Array<{
      id: string;
      playerId: string;
      matchId: string;
      seatNumber: number | null;
      expiresAt: number;
    }>
  >([]);

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
  // Dedup do incremento de eliminationCounts (separado de seenEliminations
  // pra não conflitar com a lógica de toast).
  const countedKillerForPart = useRef<Set<string>>(new Set());
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
    const m = new Map<
      string,
      { name: string; nickname: string | null; avatarUrl: string | null }
    >();
    for (const p of players) {
      m.set(p.id, {
        name: p.name,
        nickname: p.nickname,
        avatarUrl: p.profile_id ? avatarByProfile[p.profile_id] ?? null : null,
      });
    }
    return m;
  }, [players, avatarByProfile]);

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
        { event: "DELETE", schema: "public", table: "events", filter: `id=eq.${event.id}` },
        // Hard-delete (raro — admin normalmente soft-deleta). Marca local como
        // deletado pra cair na tela neutra sem precisar reload.
        () =>
          setEvent((prev) => ({ ...prev, deleted_at: new Date().toISOString() })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "physical_tables", filter },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as PhysicalTable;
          setTables((prev) => {
            const next = upsertById(prev, row, payload.eventType);
            tablesRef.current = next; // sincroniza ref pra handlers concorrentes
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter },
        (payload) => {
          const next = (payload.eventType === "DELETE" ? payload.old : payload.new) as Match;
          // V1.3: detecta mudança de blind (current_level_id mudou) pra tocar som
          if (payload.eventType === "UPDATE") {
            const prev = matchesRef.current.find((mm) => mm.id === next.id);
            if (prev && prev.current_level_id !== next.current_level_id && next.current_level_id) {
              playSynth("level-up", 0.85);
            }
          }
          setMatches((prevList) => {
            const after = upsertById(prevList, next, payload.eventType);
            matchesRef.current = after; // sincroniza pro handler de participations
            return after;
          });
          if (payload.eventType === "DELETE") return;

          // V1.3: sorteio animado REMOVIDO. Jogadores aparecem em volta da
          // mesa sem cadeira sorteada. Mantemos seenNewMatches só pra evitar
          // efeitos antigos sobre matches já existentes.
          if (payload.eventType === "INSERT") {
            seenNewMatches.current.add(next.id);
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
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Player;
          // V1.3: detecta coroação de campeão (state mudou pra CAMPEAO)
          if (payload.eventType === "UPDATE" && row.state === "CAMPEAO") {
            const prev = playersRef.current.find((pp) => pp.id === row.id);
            if (prev && prev.state !== "CAMPEAO") {
              playSynth("champion", 1);
            }
          }
          setPlayers((prev) => {
            const next = upsertById(prev, row, payload.eventType);
            playersRef.current = next;
            return next;
          });
        },
      )
      // Participations não tem event_id, então filtramos no handler.
      // V1.3: ampliado pra INSERT/DELETE/UPDATE — assim a TV vê em tempo real
      // quando alguém entra/sai/é eliminado de mesa (via /me self-service).
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participations" },
        (payload) => {
          const eventType = payload.eventType;
          const row = (eventType === "DELETE" ? payload.old : payload.new) as Participation;
          if (!row) return;

          // DELETE: payload.old só traz o id (sem REPLICA IDENTITY FULL).
          // Remove pelo id direto — se não está no state, no-op.
          if (eventType === "DELETE") {
            setParticipations((prev) => prev.filter((x) => x.id !== row.id));
            return;
          }

          // Pertence ao nosso evento? (INSERT/UPDATE têm match_id no payload)
          const m = matchesRef.current.find((mm) => mm.id === row.match_id);
          if (!m || m.event_id !== event.id) return;

          // V1.3: animação de entrada (só INSERT novo)
          if (eventType === "INSERT" && !row.eliminated_at) {
            setEnteringSeatIds((prev) => {
              const next = new Set(prev);
              next.add(row.id);
              return next;
            });
            playSynth("join", 0.8);
            setTimeout(() => {
              setEnteringSeatIds((prev) => {
                if (!prev.has(row.id)) return prev;
                const next = new Set(prev);
                next.delete(row.id);
                return next;
              });
            }, 1200);
          }

          // V1.3: animação de eliminação — captura ghost seat antes de remover.
          // Dedup key composta com `eliminated_at` pra que mesma participation
          // (id) revivida via rebuy+join entre em nova eliminação como evento
          // novo. Caso contrário a 2ª kill do mesmo killer no mesmo jogador
          // não contava.
          const elimKey = row.eliminated_at
            ? `${row.id}-${row.eliminated_at}`
            : null;
          if (
            eventType === "UPDATE" &&
            row.eliminated_at &&
            elimKey &&
            !seenEliminations.current.has(elimKey)
          ) {
            const ageMs = Date.now() - new Date(row.eliminated_at).getTime();
            if (ageMs < 30_000) {
              playSynth("eliminate", 0.9);
              setGhostSeats((prev) => [
                ...prev,
                {
                  id: row.id,
                  playerId: row.player_id,
                  matchId: row.match_id,
                  seatNumber: row.seat_number,
                  expiresAt: Date.now() + 2500,
                },
              ]);
              setTimeout(() => {
                setGhostSeats((prev) => prev.filter((g) => g.id !== row.id));
              }, 2500);

              // V1.3: incrementa contador de "kills" do eliminador → fogo na TV
              const killerId = row.eliminated_by_player_id;
              if (killerId && !countedKillerForPart.current.has(elimKey)) {
                countedKillerForPart.current.add(elimKey);
                setEliminationCounts((prev) => {
                  const before = prev[killerId] ?? 0;
                  const after = before + 1;
                  // Tier-crossing: toca um "level-up" quando entra em tier visível
                  const TIERS = [2, 3, 4, 5, 6, 7, 10];
                  if (TIERS.includes(after)) playSynth("level-up", 0.55);
                  return { ...prev, [killerId]: after };
                });
              }
            }
          }

          // Atualiza state de participations (mantém só ativas: eliminated_at null)
          setParticipations((prev) => {
            const isActive = !row.eliminated_at;
            const without = prev.filter((x) => x.id !== row.id);
            return isActive ? [...without, row] : without;
          });

          // Toast de eliminação (mesma dedup key composta — re-eliminação
          // após rebuy gera novo toast).
          if (eventType !== "UPDATE") return;
          if (!row.eliminated_at || !elimKey) return;
          if (seenEliminations.current.has(elimKey)) return;

          const ageMs = Date.now() - new Date(row.eliminated_at).getTime();
          if (ageMs > 30_000) return;

          seenEliminations.current.add(elimKey);

          const player = playersRef.current.find((pp) => pp.id === row.player_id);
          const ptable = tablesRef.current.find((tt) => tt.id === m.physical_table_id);
          if (!player || !ptable) return;

          playSound("elimination");
          setToasts((prev) => [
            ...prev,
            {
              id: row.id,
              playerName: player.name,
              nickname: player.nickname,
              finalPosition: row.final_position,
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

  // Reações em tempo real (broadcast por evento)
  const { reactions } = useReactions(event.id);
  // Recebe broadcast quando alguém troca a foto e re-busca avatarByProfile via SSR
  useAvatarRefresh();

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

  // V1.3: seats por match — inclui seats ativos + ghosts (eliminating) + flags
  // de entrada (entering) pras animações na TV.
  // Pré-ordena participações por created_at pra que os seats fiquem na ordem
  // de chegada (sem sorteio de cadeira).
  const seatsByMatch = useMemo(() => {
    const map: Record<string, PokerSeat[]> = {};
    const sortedParts = [...participations].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    for (const p of sortedParts) {
      if (p.eliminated_at) continue;
      const player = playersById.get(p.player_id);
      if (!player) continue;
      const seat: PokerSeat = {
        id: p.id,
        playerId: p.player_id,
        name: player.name,
        nickname: player.nickname,
        seatNumber: p.seat_number,
        isHighlighted: false,
        avatarUrl: player.avatarUrl,
        isEntering: enteringSeatIds.has(p.id),
        eliminationCount: eliminationCounts[p.player_id] ?? 0,
      };
      (map[p.match_id] ??= []).push(seat);
    }
    // Adiciona ghost seats — players acabados de eliminar (durante a animação)
    for (const ghost of ghostSeats) {
      const player = playersById.get(ghost.playerId);
      if (!player) continue;
      (map[ghost.matchId] ??= []).push({
        id: `ghost-${ghost.id}`,
        playerId: ghost.playerId,
        name: player.name,
        nickname: player.nickname,
        seatNumber: ghost.seatNumber,
        isHighlighted: false,
        avatarUrl: player.avatarUrl,
        isEliminating: true,
      });
    }
    // Seats já foram populados na ordem de chegada (sortedParts). Ghosts
    // vão no fim — eles saem da animação rápido, então a posição visual
    // exata não importa.
    return map;
  }, [participations, playersById, enteringSeatIds, ghostSeats, eliminationCounts]);

  const presentes = players.filter((p) => p.state === "PRESENTE").length;
  const classificados = players.filter(
    (p) => p.state === "CLASSIFICADO" || p.state === "NA_FINAL",
  );

  // Soft-delete via Realtime: admin apagou o evento enquanto a TV estava aberta.
  // Trocamos imediatamente pra tela neutra; a TV continua ligada pro próximo.
  if (event.deleted_at) return <EmptyTV reason="deleted" />;

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
          <Podium players={players} avatarByProfile={avatarByProfile} />
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
                  seats={seatsByMatch[finalMatch.id] ?? []}
                  reactions={reactions}
                />
              </div>
            );
          })()}
        </section>
      ) : (
        <section className="flex-1 grid auto-rows-fr gap-6 p-10 lg:grid-cols-2">
          {tables.map((t) => {
            const m = activeMatchByTable[t.id];
            return (
              <MatchCard
                key={t.id}
                table={t}
                match={m}
                level={m?.current_level_id ? levelsById[m.current_level_id] : undefined}
                seats={m ? (seatsByMatch[m.id] ?? []) : []}
                reactions={reactions}
              />
            );
          })}
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

      {/* Botão flutuante pra ativar som (autoplay policy) */}
      <SoundToggle />

      {/* Overlay "mostrar fichas" — escuta chip_displays */}
      <ChipDisplayOverlay eventId={event.id} playersById={playersById} />

      {/* Modo pausa geral — cobre tudo quando ativo */}
      {event.tv_paused_message && event.tv_paused_message.trim().length > 0 && (
        <TvPausedOverlay eventName={event.name} message={event.tv_paused_message} />
      )}

      {/* Indicador discreto da conexão Realtime */}
      <RealtimeStatus eventId={event.id} />
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
