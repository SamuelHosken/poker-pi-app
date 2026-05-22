"use client";

/**
 * V1.3 — Cobre a TV inteira quando event.tv_paused_message está ativo.
 * Pulse sutil na mensagem pra mostrar "vivo".
 */
export function TvPausedOverlay({
  eventName,
  message,
}: {
  eventName: string;
  message: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-12 bg-gradient-to-b from-ink-2 via-ink to-ink px-10 text-center">
      {/* "Logo" do evento — nome em grande */}
      <div className="space-y-3">
        <span className="font-mono text-sm uppercase tracking-[0.5em] text-gold">
          Poker Pi
        </span>
        <h1 className="font-display text-7xl font-light leading-none tracking-tight text-paper sm:text-[120px]">
          {eventName}
        </h1>
      </div>

      {/* Mensagem grande pulsante */}
      <div className="space-y-4">
        <p
          className="font-display text-5xl font-light italic text-gold sm:text-7xl"
          style={{ animation: "pause-pulse 2.4s ease-in-out infinite" }}
        >
          {message}
        </p>
      </div>

      {/* Linha decorativa */}
      <div
        aria-hidden
        className="h-px w-32 bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <style>{`
        @keyframes pause-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
