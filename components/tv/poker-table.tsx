import type { CSSProperties, ReactNode } from "react";

export type PokerSeat = {
  id: string;
  playerId: string;
  name: string;
  nickname: string | null;
  seatNumber: number | null;
  isHighlighted: boolean;
  avatarUrl?: string | null;
  // V1.3: animações transitórias na TV
  isEntering?: boolean; // entrou agora — pop-in
  isEliminating?: boolean; // saiu agora — flash vermelho + skull + fade out
};

export type SeatReaction = {
  id: string; // unique local
  playerId: string;
  emoji: string;
};

/**
 * Mesa oval estilizada com avatares apoiados na borda. Compartilhada entre
 * `/me/mesa/[tableId]` (mobile, com isHighlighted = "Você") e `/tv/[eventId]`
 * (TV, com isHighlighted sempre false). O miolo do feltro recebe conteúdo
 * arbitrário via `centerSlot` — número da mesa no player, timer + blinds na TV.
 */
export function PokerTable({
  seats,
  centerSlot,
  avatarSize = "md",
  reactions = [],
}: {
  seats: PokerSeat[];
  centerSlot: ReactNode;
  avatarSize?: "md" | "lg";
  reactions?: SeatReaction[];
}) {
  const n = Math.max(seats.length, 1);
  // Semi-eixos da elipse (% do container quadrado)
  const RX = 38;
  const RY = 26;

  const avatarBox =
    avatarSize === "lg"
      ? "size-16 text-2xl sm:size-20 sm:text-3xl"
      : "size-12 text-lg sm:size-14 sm:text-xl";
  const labelClass =
    avatarSize === "lg"
      ? "max-w-[140px] text-sm sm:text-base"
      : "max-w-[72px] text-[11px]";

  return (
    <div className="relative aspect-square w-full">
      {/* Sombra projetada (faz a mesa "flutuar") */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[62%] h-[10%] w-[55%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl"
      />

      {/* Tampo */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[50%] border border-gold/25 bg-gradient-to-b from-ink-2 via-ink to-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.04),inset_0_-30px_60px_rgba(0,0,0,0.5)]"
        style={{ width: `${RX * 2}%`, height: `${RY * 2}%` }}
      >
        <div className="absolute inset-[6%] rounded-[50%] border border-gold/15" />
        <div className="absolute inset-[12%] rounded-[50%] border border-gold/5" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
          {centerSlot}
        </div>
      </div>

      {/* Avatares apoiados na borda */}
      {seats.length === 0
        ? null
        : seats.map((s, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
            const cx = 50 + RX * Math.cos(angle);
            const cy = 50 + RY * Math.sin(angle);
            const displayLabel = s.isHighlighted
              ? "Você"
              : s.nickname || s.name.split(" ")[0];
            const seatReactions = reactions.filter((r) => r.playerId === s.playerId);
            const seatAnimClass = s.isEliminating
              ? "animate-seat-eliminate"
              : s.isEntering
                ? "animate-seat-enter"
                : "";
            // Direção de entrada: vem de FORA da mesa em direção ao seat.
            // (cos, sin) aponta pra fora; multiplicamos por distância em px.
            const enterDx = s.isEntering ? Math.cos(angle) * 120 : 0;
            const enterDy = s.isEntering ? Math.sin(angle) * 120 : 0;
            return (
              <div
                key={s.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${seatAnimClass}`}
                style={
                  {
                    left: `${cx}%`,
                    top: `${cy}%`,
                    "--enter-dx": `${enterDx}px`,
                    "--enter-dy": `${enterDy}px`,
                  } as CSSProperties & Record<string, string>
                }
              >
                {/* Glow dourado que pulsa durante a entrada */}
                {s.isEntering && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-2xl"
                    style={{
                      animation: "seat-enter-glow 900ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                    }}
                  />
                )}
                <div className="relative flex flex-col items-center gap-1.5">
                  {/* Reações flutuantes — saem do topo do avatar */}
                  {seatReactions.map((r) => (
                    <span
                      key={r.id}
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 -top-2 text-3xl sm:text-4xl"
                      style={{
                        animation: "reaction-float 5s cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                      }}
                    >
                      {r.emoji}
                    </span>
                  ))}

                  {/* Skull caveira sobe quando jogador é eliminado */}
                  {s.isEliminating && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 -top-2 text-4xl sm:text-5xl"
                      style={{ animation: "seat-skull-float 2.5s ease-out forwards" }}
                    >
                      💀
                    </span>
                  )}

                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatarUrl}
                      alt={s.name}
                      loading="lazy"
                      decoding="async"
                      className={`overflow-hidden rounded-full object-cover shadow-lg ${avatarBox} ${
                        s.isEliminating
                          ? "grayscale ring-2 ring-red-poker/80"
                          : s.isHighlighted
                            ? "ring-2 ring-gold/80 ring-offset-2 ring-offset-ink"
                            : "ring-1 ring-gold/30"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex items-center justify-center rounded-full font-display font-light shadow-lg ${avatarBox} ${
                        s.isEliminating
                          ? "bg-ink-2 text-red-poker ring-2 ring-red-poker/80"
                          : s.isHighlighted
                            ? "bg-gold text-ink ring-2 ring-gold/60 ring-offset-2 ring-offset-ink"
                            : "border border-gold/30 bg-ink-2 text-gold"
                      }`}
                      aria-label={s.name}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`${labelClass} truncate text-center font-medium ${
                      s.isEliminating
                        ? "text-red-poker"
                        : s.isHighlighted
                          ? "text-gold"
                          : "text-paper/80"
                    }`}
                  >
                    {s.isEliminating ? "ELIMINADO" : displayLabel}
                  </span>
                </div>
              </div>
            );
          })}

      <style>{`
        /* Seat entering — vem de fora da mesa em direção ao próprio seat,
           com escala + blur (focando), pequena rotação e overshoot. */
        @keyframes seat-enter {
          0% {
            transform: translate(
                calc(-50% + var(--enter-dx, 0px)),
                calc(-50% + var(--enter-dy, 0px))
              )
              scale(0.45)
              rotate(-8deg);
            opacity: 0;
            filter: blur(6px);
          }
          55% {
            transform: translate(-50%, -50%) scale(1.18) rotate(2deg);
            opacity: 1;
            filter: blur(0);
          }
          80% {
            transform: translate(-50%, -50%) scale(0.96) rotate(-1deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0);
            opacity: 1;
          }
        }
        .animate-seat-enter {
          animation: seat-enter 1100ms cubic-bezier(0.16, 0.84, 0.32, 1.15) both;
        }
        /* Glow dourado por trás durante a entrada */
        @keyframes seat-enter-glow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
        /* Seat eliminating — flash + tremida + fade out */
        @keyframes seat-eliminate {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          15% { transform: translate(-52%, -50%) scale(1.05); opacity: 1; }
          25% { transform: translate(-48%, -50%) scale(1.05); opacity: 1; }
          35% { transform: translate(-52%, -50%) scale(1.05); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
          100% { transform: translate(-50%, -45%) scale(0.85); opacity: 0; }
        }
        .animate-seat-eliminate {
          animation: seat-eliminate 2.5s ease-out forwards;
        }
        @keyframes seat-skull-float {
          0% { transform: translate(-50%, 8px) scale(0.4); opacity: 0; }
          15% { transform: translate(-50%, -4px) scale(1.4); opacity: 1; }
          50% { transform: translate(-50%, -28px) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -64px) scale(1); opacity: 0; }
        }
        @keyframes reaction-float {
          0% { transform: translate(-50%, 8px) scale(0.5); opacity: 0; }
          15% { transform: translate(-50%, -4px) scale(1.4); opacity: 1; }
          40% { transform: translate(-50%, -16px) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%, -38px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -56px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
