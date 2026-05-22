"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { playSynth } from "@/lib/audio/synth";
import type { SeatReaction } from "@/components/tv/poker-table";

const REACTION_TTL_MS = 5000;
const CLEANUP_INTERVAL_MS = 1000;
const CHANNEL_PREFIX = "reactions-";

type Payload = {
  playerId: string;
  emoji: string;
  // Identidade local da emissão pra dedup em caso de re-broadcast
  cid: string;
};

/**
 * V1.3 — Subscribe a reações de um evento via Supabase Realtime Broadcast.
 * Mantém lista local que expira após TTL. Retorna `reactions` + `sendReaction`.
 *
 * Broadcast (vs DB table): zero round-trip, sem migration, ephemeral.
 * Limitação aceitável: se a TV recarregar, perde as reações em voo (vivem só
 * 5s mesmo).
 */
export function useReactions(eventId: string) {
  const [reactions, setReactions] = useState<SeatReaction[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null,
  );
  const seenCids = useRef<Set<string>>(new Set());

  // Subscribe + expiração
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`${CHANNEL_PREFIX}${eventId}`, {
      config: { broadcast: { self: true } }, // recebe a própria emissão (preview imediato)
    });

    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      const p = payload as Payload;
      if (!p?.playerId || !p?.emoji || !p?.cid) return;
      if (seenCids.current.has(p.cid)) return;
      seenCids.current.add(p.cid);

      playSynth("reaction", 0.55);
      setReactions((prev) => [
        ...prev,
        { id: p.cid, playerId: p.playerId, emoji: p.emoji },
      ]);

      // Auto-remove depois do TTL
      setTimeout(() => {
        setReactions((cur) => cur.filter((r) => r.id !== p.cid));
      }, REACTION_TTL_MS);
    });

    channel.subscribe();
    channelRef.current = channel;

    // Cleanup periódico (defensivo contra setTimeouts perdidos)
    const interval = setInterval(() => {
      // mantém só as últimas N pra evitar memory leak se algo travar
      setReactions((prev) => (prev.length > 30 ? prev.slice(-30) : prev));
    }, CLEANUP_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId]);

  const sendReaction = useCallback(
    async (playerId: string, emoji: string) => {
      const channel = channelRef.current;
      if (!channel) return;
      const cid = `${playerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await channel.send({
        type: "broadcast",
        event: "reaction",
        payload: { playerId, emoji, cid } satisfies Payload,
      });
    },
    [],
  );

  return { reactions, sendReaction };
}
