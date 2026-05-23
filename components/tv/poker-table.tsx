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
  // V1.3: número de eliminações que o player fez no evento. Drives o "fogo":
  // 2-4 = chamas no canto; 5+ = aura pulsando; cor/intensidade escalam.
  eliminationCount?: number;
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
  // Semi-eixos da elipse do tampo (% do container quadrado)
  const RX = 38;
  const RY = 26;
  // V1.3: raio dos seats — um pouco maior que o do tampo, pra avatares ficarem
  // sentados POR FORA da mesa em vez de sobre a borda. Glow não conflita.
  const ARX = 44;
  const ARY = 32;

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
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[50%] border border-gold/30 bg-gradient-to-b from-ink-2 via-ink to-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.04),inset_0_-30px_60px_rgba(0,0,0,0.5),0_0_24px_-10px_rgba(212,175,55,0.3)]"
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
            const cx = 50 + ARX * Math.cos(angle);
            const cy = 50 + ARY * Math.sin(angle);
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
                <div
                  className={`relative flex flex-col items-center gap-1.5 ${
                    s.isEntering || s.isEliminating ? "" : "animate-seat-float"
                  }`}
                  style={{
                    // Stagger por seat — cada um começa em fase diferente
                    animationDelay: `${i * -0.85}s`,
                  }}
                >
                  {/* Reações flutuantes — saem do topo do avatar */}
                  {seatReactions.map((r) => (
                    <span
                      key={r.id}
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 -top-2 z-20 text-3xl sm:text-4xl"
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
                      className="pointer-events-none absolute left-1/2 -top-2 z-20 text-4xl sm:text-5xl"
                      style={{ animation: "seat-skull-float 2.5s ease-out forwards" }}
                    >
                      💀
                    </span>
                  )}

                  {/* V1.3: wrapper do avatar pra ancorar aura + chamas no canto
                      EXATAMENTE em volta da foto (não em volta da coluna). */}
                  <div className="relative">
                    {/* Aura (5+ kills) — atrás da foto */}
                    {!s.isEliminating &&
                      (s.eliminationCount ?? 0) >= 5 && (
                        <FireAura count={s.eliminationCount ?? 0} />
                      )}

                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.avatarUrl}
                        alt={s.name}
                        loading="lazy"
                        decoding="async"
                        className={`relative overflow-hidden rounded-full object-cover ${avatarBox} ${
                          s.isEliminating
                            ? "grayscale ring-2 ring-red-poker/80 shadow-lg"
                            : s.isHighlighted
                              ? "ring-2 ring-gold/80 ring-offset-2 ring-offset-ink shadow-[0_0_14px_-3px_rgba(212,175,55,0.55)]"
                              : "ring-1 ring-gold/40 shadow-[0_0_10px_-3px_rgba(212,175,55,0.45)]"
                        }`}
                      />
                    ) : (
                      <div
                        className={`relative flex items-center justify-center rounded-full font-display font-light ${avatarBox} ${
                          s.isEliminating
                            ? "bg-ink-2 text-red-poker ring-2 ring-red-poker/80 shadow-lg"
                            : s.isHighlighted
                              ? "bg-gold text-ink ring-2 ring-gold/60 ring-offset-2 ring-offset-ink shadow-[0_0_16px_-3px_rgba(212,175,55,0.6)]"
                              : "border border-gold/40 bg-ink-2 text-gold shadow-[0_0_10px_-3px_rgba(212,175,55,0.45)]"
                        }`}
                        aria-label={s.name}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Chamas no canto (2+ kills) — ancoradas no canto do avatar */}
                    {!s.isEliminating &&
                      (s.eliminationCount ?? 0) >= 2 && (
                        <CornerFlames count={s.eliminationCount ?? 0} />
                      )}
                  </div>
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
                  {/* V1.3: badge "ON FIRE" pra streak alto (7+ kills) */}
                  {!s.isEliminating && (s.eliminationCount ?? 0) >= 7 && (
                    <OnFireBadge count={s.eliminationCount ?? 0} />
                  )}
                </div>
              </div>
            );
          })}

      <style>{`
        /* V1.3: flutuação suave dos seats — meio respirar */
        @keyframes seat-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-seat-float {
          animation: seat-float 5.5s ease-in-out infinite;
        }
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
        /* V1.3: hot streak — chamas tremulando no canto do avatar */
        @keyframes fire-flicker {
          0%, 100% { transform: scale(1) rotate(-4deg); opacity: 0.95; }
          50% { transform: scale(1.18) rotate(4deg); opacity: 1; }
        }
        /* Aura pulsando atrás do avatar (5+ kills) */
        @keyframes fire-aura {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
        }
        /* Chama subindo de tempos em tempos (7+ kills) */
        @keyframes fire-rise {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -52px) scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
 * V1.3 — Hot streak helpers (aura, chamas no canto, badge ON FIRE)
 * ============================================================ */

function CornerFlames({ count }: { count: number }) {
  // 2 kills = 1 chama, 3 = 2 chamas, 4+ = 3 chamas
  const n = Math.min(count - 1, 3);
  return (
    <div className="pointer-events-none absolute -top-2 -right-1 z-10 flex">
      {Array.from({ length: n }).map((_, idx) => (
        <span
          key={idx}
          aria-hidden
          className="text-sm sm:text-base"
          style={{
            marginLeft: idx === 0 ? 0 : "-6px",
            animation: `fire-flicker ${1.4 + idx * 0.25}s ease-in-out infinite`,
            animationDelay: `${idx * -0.5}s`,
            filter: "drop-shadow(0 0 4px rgba(249,115,22,0.85))",
          }}
        >
          🔥
        </span>
      ))}
    </div>
  );
}

function FireAura({ count }: { count: number }) {
  // 5 = aura suave laranja. 7 = cor vira vermelha. 10+ = vermelho/dourado.
  // Tamanho RELATIVO ao avatar — halo APERTADO em volta da foto pra NÃO
  // invadir a área do nome. 130–180% só estende ~10–20px em volta.
  const intensity = Math.min((count - 5) / 7, 1); // 0..1
  const size = 135 + intensity * 45; // 135%..180% do avatar
  const opacity = 0.6 + intensity * 0.35;
  const color =
    count >= 10
      ? "rgba(220,38,38,0.95)"
      : count >= 7
        ? "rgba(239,68,68,0.9)"
        : "rgba(249,115,22,0.9)";
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: `${size}%`,
          height: `${size}%`,
          // Gradient mais concentrado no centro (40% sólido) e cortando
          // mais cedo (até 80%) — halo nítido, sem fumaça difusa.
          background: `radial-gradient(circle, ${color} 0%, ${color.replace(/[\d.]+\)$/, "0.5)")} 40%, rgba(0,0,0,0) 80%)`,
          opacity,
          filter: "blur(6px)",
          animation: "fire-aura 1.8s ease-in-out infinite",
        }}
      />
      {/* Chama subindo periodicamente em streaks altos — sai DE CIMA do avatar */}
      {count >= 7 && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-lg sm:text-xl"
          style={{
            animation: `fire-rise ${count >= 10 ? 1.6 : 2.4}s ease-out infinite`,
            filter: "drop-shadow(0 0 6px rgba(239,68,68,0.9))",
          }}
        >
          🔥
        </span>
      )}
    </>
  );
}

function OnFireBadge({ count }: { count: number }) {
  // 7-9 = vermelho. 10+ = dourado destacado.
  const isPeak = count >= 10;
  return (
    <span
      className={`absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] shadow-md sm:text-[9px] ${
        isPeak
          ? "bg-gold text-ink"
          : "bg-red-poker/90 text-paper"
      }`}
      style={{
        animation: "fire-flicker 1.6s ease-in-out infinite",
      }}
    >
      {isPeak ? `🔥 ${count} kills` : "🔥 On Fire"}
    </span>
  );
}
