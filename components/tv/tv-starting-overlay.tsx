"use client";

import { useEffect, useState } from "react";

/**
 * V1.3 — Overlay "vamos começar jajá" com countdown ao vivo até `startsAt`.
 * Aparece SOBRE qualquer estado de jogo (similar ao TvPausedOverlay) quando
 * `event.tv_starts_at` está setado.
 *
 * Quando o countdown zera, mostramos "Já começou!" por alguns segundos —
 * admin pode tirar o overlay manualmente, ou Trigger automático após X
 * segundos no zero (não implementado, intencional — mantém controle no admin).
 */
export function TvStartingOverlay({
  eventName,
  startsAt,
}: {
  eventName: string;
  startsAt: Date;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diffMs = startsAt.getTime() - now;
  const isFuture = diffMs > 0;
  const absMs = Math.abs(diffMs);
  const totalSec = Math.floor(absMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const timeStr = startsAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const countdown =
    h > 0
      ? `${h}h ${pad(m)}min`
      : m > 0
        ? `${m}min ${pad(s)}s`
        : `${s}s`;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-ink-2 via-ink to-ink px-10 text-center">
      <div className="space-y-3">
        <span className="font-mono text-sm uppercase tracking-[0.5em] text-gold">
          Poker Pi
        </span>
        <h1 className="font-display text-6xl font-light leading-none tracking-tight text-paper sm:text-[100px]">
          {eventName}
        </h1>
      </div>

      <div className="space-y-2">
        <p
          className="font-display text-4xl font-light italic text-gold sm:text-6xl"
          style={{ animation: "starting-pulse 2.4s ease-in-out infinite" }}
        >
          {isFuture ? "Vamos começar jajá" : "Já vai começar!"}
        </p>
      </div>

      <div
        aria-hidden
        className="h-px w-32 bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <div className="space-y-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-gray-soft">
          {isFuture ? `Começa às ${timeStr}` : `Era às ${timeStr}`}
        </span>
        <div className="font-mono text-7xl font-light tabular-nums text-paper sm:text-[140px]">
          {isFuture ? countdown : "00:00"}
        </div>
      </div>

      <style>{`
        @keyframes starting-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
