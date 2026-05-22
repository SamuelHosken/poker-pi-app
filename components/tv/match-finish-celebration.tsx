"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/audio/play-sound";

export type CelebrationData = {
  matchId: string;
  winnerName: string;
  winnerNickname: string | null;
  tableNumber: number;
};

const DURATION_MS = 4500;
const FADE_OUT_START_MS = DURATION_MS - 500;

export function MatchFinishCelebration({
  data,
  onDone,
}: {
  data: CelebrationData;
  onDone: () => void;
}) {
  useEffect(() => {
    playSound("match-finish");

    // Burst of gold confetti from both bottom corners
    const goldColors = ["#C9A961", "#F5F1E8", "#FFFFFF"];
    const fire = (originX: number) =>
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 55,
        origin: { x: originX, y: 1 },
        colors: goldColors,
        ticks: 200,
      });
    fire(0.15);
    fire(0.85);
    const t2 = setTimeout(() => {
      fire(0.3);
      fire(0.7);
    }, 800);
    const t3 = setTimeout(() => {
      fire(0.5);
    }, 1600);

    const dismissT = setTimeout(onDone, DURATION_MS);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(dismissT);
    };
  }, [data.matchId, onDone]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/85 backdrop-blur-sm text-center"
      style={{
        animation: `fade-in 250ms ease-out forwards, fade-out 500ms ${FADE_OUT_START_MS}ms forwards`,
      }}
    >
      <span className="font-mono text-sm uppercase tracking-[0.4em] text-gold">
        Mesa {data.tableNumber} · Vencedor
      </span>
      <h2 className="mt-6 max-w-[80vw] font-display text-[clamp(120px,16vw,240px)] font-light leading-none tracking-tight text-paper">
        {data.winnerName}
      </h2>
      {data.winnerNickname && (
        <p className="mt-4 font-display text-3xl italic text-gold">
          {data.winnerNickname}
        </p>
      )}
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-gray-soft">
        Classificado para a mesa final
      </p>
    </div>
  );
}
