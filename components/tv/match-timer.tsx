"use client";

import { useEffect, useState } from "react";
import { calculateTimeRemainingMs } from "@/lib/timer/calculate";
import { formatTime } from "@/lib/timer/format";
import type { Tables } from "@/lib/types/database.types";

type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

/**
 * Display do cronômetro. `setInterval` aqui SÓ força re-render —
 * o cálculo real do tempo vem das funções puras em `lib/timer/calculate.ts`,
 * que leem dados server-authoritative do match.
 */
export function MatchTimer({ match, level }: { match: Match; level: BlindLevel }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (match.state !== "JOGANDO") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [match.state]);

  const remaining = calculateTimeRemainingMs(match, level);

  return (
    <div
      className={`font-mono text-[120px] leading-none tabular-nums ${
        match.state === "PAUSADA" ? "text-red-poker" : "text-paper"
      }`}
      aria-live="off"
    >
      {formatTime(remaining)}
    </div>
  );
}
