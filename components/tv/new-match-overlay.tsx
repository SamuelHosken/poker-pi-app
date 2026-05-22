"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { playSound } from "@/lib/audio/play-sound";
import type { Tables } from "@/lib/types/database.types";

type Participation = Tables<"participations">;

export type NewMatchData = {
  matchId: string;
  tableNumber: number;
  isFinalTable: boolean;
};

const FETCH_RETRY_DELAY_MS = 300;
const FETCH_MAX_RETRIES = 4;
const TOTAL_DISPLAY_MS = 3500;

export function NewMatchOverlay({
  data,
  playersById,
  onDone,
}: {
  data: NewMatchData;
  playersById: Map<string, { name: string; nickname: string | null }>;
  onDone: () => void;
}) {
  const [participations, setParticipations] = useState<Participation[] | null>(null);

  // Fetch participations (podem chegar depois do match INSERT no realtime)
  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const supabase = createClient();

    async function fetchParts(): Promise<void> {
      const { data: rows } = await supabase
        .from("participations")
        .select("*")
        .eq("match_id", data.matchId)
        .order("seat_number", { ascending: true });
      if (cancelled) return;
      if (rows && rows.length > 0) {
        setParticipations(rows);
      } else if (retries < FETCH_MAX_RETRIES) {
        retries++;
        setTimeout(fetchParts, FETCH_RETRY_DELAY_MS);
      } else {
        onDone(); // sem participações, desiste
      }
    }

    fetchParts();
    return () => {
      cancelled = true;
    };
  }, [data.matchId, onDone]);

  // Som de chamada quando começa a revelar
  useEffect(() => {
    if (participations && participations.length > 0) {
      playSound("calling");
    }
  }, [participations]);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(onDone, TOTAL_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink/65 px-10 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-center"
      >
        <span className="font-mono text-sm uppercase tracking-[0.4em] text-gold">
          {data.isFinalTable ? "Mesa Final" : `Mesa ${data.tableNumber}`}
        </span>
        <h2 className="mt-2 font-display text-[clamp(72px,10vw,160px)] font-light leading-none tracking-tight text-paper">
          Sorteando<span className="text-red-poker">.</span>
        </h2>
      </motion.div>

      {participations && (
        <ol className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {participations.map((p, idx) => {
            const player = playersById.get(p.player_id);
            return (
              <motion.li
                key={p.id}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + idx * 0.25, duration: 0.35 }}
                className="flex items-center gap-3 rounded-md border border-line bg-ink-2/80 px-4 py-3"
              >
                <span className="font-mono text-xs text-gold">
                  Cadeira {p.seat_number ?? idx + 1}
                </span>
                <span className="truncate font-display text-2xl font-light text-paper">
                  {player?.name ?? "—"}
                </span>
                {player?.nickname && (
                  <span className="ml-auto truncate font-display text-sm italic text-gold">
                    {player.nickname}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.div>
  );
}

export function AnimatedNewMatch(props: {
  data: NewMatchData | null;
  playersById: Map<string, { name: string; nickname: string | null }>;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {props.data && (
        <NewMatchOverlay
          key={props.data.matchId}
          data={props.data}
          playersById={props.playersById}
          onDone={props.onDone}
        />
      )}
    </AnimatePresence>
  );
}
