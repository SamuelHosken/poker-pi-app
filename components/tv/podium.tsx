"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/audio/play-sound";
import type { Tables } from "@/lib/types/database.types";

type Player = Tables<"players">;

export function Podium({ players }: { players: Player[] }) {
  const champ = players.find((p) => p.state === "CAMPEAO");
  const vice = players.find((p) => p.state === "VICE");
  const terceiro = players.find((p) => p.state === "TERCEIRO");
  const outros = players
    .filter((p) => p.state === "OUTROS_FINALISTAS")
    .sort((a, b) => (a.final_position ?? 99) - (b.final_position ?? 99));

  // Confete + som de campeão quando o pódio aparece
  useEffect(() => {
    if (!champ) return;
    playSound("match-finish", 0.9);
    const goldColors = ["#C9A961", "#F5F1E8", "#FFFFFF"];
    const burst = (x: number) =>
      confetti({
        particleCount: 80,
        spread: 75,
        startVelocity: 60,
        origin: { x, y: 1 },
        colors: goldColors,
        ticks: 250,
      });
    burst(0.2);
    burst(0.8);
    const t = setTimeout(() => {
      burst(0.5);
    }, 900);
    return () => clearTimeout(t);
  }, [champ]);

  if (!champ) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ink p-10 text-center">
        <p className="font-display text-3xl italic text-gray-soft">
          Aguardando campeão…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 bg-gradient-to-b from-ink-2 to-ink p-10 text-center">
      <span className="font-mono text-sm uppercase tracking-[0.4em] text-gold">
        Pódio · {champ.name && "Campeão"}
      </span>

      <div className="flex w-full max-w-5xl items-end justify-center gap-4 sm:gap-8">
        <PodiumStep place={2} player={vice} heightClass="h-44" />
        <PodiumStep place={1} player={champ} heightClass="h-60" highlighted />
        <PodiumStep place={3} player={terceiro} heightClass="h-32" />
      </div>

      {outros.length > 0 && (
        <ol className="mt-8 grid max-w-3xl grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {outros.map((p) => (
            <li
              key={p.id}
              className="rounded-md border border-line bg-ink-2 px-3 py-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
                {p.final_position}º
              </span>
              <span className="ml-2 text-paper">{p.name}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PodiumStep({
  place,
  player,
  heightClass,
  highlighted = false,
}: {
  place: 1 | 2 | 3;
  player: Player | undefined;
  heightClass: string;
  highlighted?: boolean;
}) {
  const placeRoman = place === 1 ? "I" : place === 2 ? "II" : "III";
  const accent =
    place === 1
      ? "border-gold text-gold"
      : place === 2
        ? "border-paper/40 text-paper"
        : "border-gray-soft text-gray-soft";

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="mb-3 text-center">
        <div className="font-display text-xs uppercase tracking-[0.3em] text-gray-soft">
          {place}º lugar
        </div>
        <div
          className={`mt-1 font-display font-light leading-tight ${
            highlighted ? "text-paper" : "text-paper"
          }`}
          style={{ fontSize: highlighted ? "clamp(36px,5vw,72px)" : "clamp(20px,3vw,36px)" }}
        >
          {player?.name ?? "—"}
        </div>
        {player?.nickname && (
          <div className="font-display text-sm italic text-gold">{player.nickname}</div>
        )}
      </div>
      <div
        className={`flex w-full items-center justify-center rounded-t-lg border-t border-x bg-ink-2 ${heightClass} ${accent}`}
      >
        <span
          className="font-display font-light"
          style={{ fontSize: highlighted ? "120px" : "72px" }}
        >
          {placeRoman}
        </span>
      </div>
    </div>
  );
}
