"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/lib/types/database.types";

type Player = Tables<"players">;

const STATE_INFO: Record<
  string,
  { label: string; sub: string; tone: "neutral" | "active" | "win" | "out" }
> = {
  INSCRITO: { label: "Inscrito", sub: "Aguardando confirmação de presença", tone: "neutral" },
  PRESENTE: { label: "Você está na fila", sub: "Aguarde ser chamado para uma mesa", tone: "active" },
  CHAMADO: { label: "Você foi chamado!", sub: "Dirija-se à mesa", tone: "active" },
  JOGANDO: { label: "Você está jogando", sub: "Boa sorte na mesa", tone: "active" },
  ELIMINADO: { label: "Eliminado", sub: "Acompanhe o restante na TV", tone: "out" },
  CLASSIFICADO: { label: "Classificado!", sub: "Pra Mesa Final — aguarde montagem", tone: "win" },
  NA_FINAL: { label: "Mesa Final", sub: "Você está na disputa final", tone: "win" },
  CAMPEAO: { label: "Campeão", sub: "Parabéns!", tone: "win" },
  VICE: { label: "Vice-campeão", sub: "Boa jornada — 2º lugar", tone: "win" },
  TERCEIRO: { label: "3º lugar", sub: "Pódio garantido", tone: "win" },
  OUTROS_FINALISTAS: { label: "Finalista", sub: "Você chegou na mesa final", tone: "win" },
};

export function PlayerStatus({ initialPlayer }: { initialPlayer: Player }) {
  const [player, setPlayer] = useState(initialPlayer);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`player-${initialPlayer.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `id=eq.${initialPlayer.id}`,
        },
        (payload) => setPlayer(payload.new as Player),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialPlayer.id]);

  const info = STATE_INFO[player.state] ?? {
    label: player.state,
    sub: "",
    tone: "neutral" as const,
  };

  const toneClass =
    info.tone === "active"
      ? "border-gold/60 text-gold"
      : info.tone === "win"
        ? "border-gold/80 text-gold"
        : info.tone === "out"
          ? "border-red-poker/50 text-red-poker"
          : "border-line text-paper";

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-ink px-6 py-12 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Poker Pi
      </span>
      <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-paper">
        {player.name}
      </h1>
      {player.nickname && (
        <p className="font-display text-lg italic text-gold">{player.nickname}</p>
      )}

      <div
        className={`mt-12 inline-flex flex-col items-center rounded-2xl border-2 bg-ink-2 px-8 py-10 ${toneClass}`}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">
          Status
        </div>
        <div className="mt-2 font-display text-[clamp(36px,9vw,72px)] font-light leading-none">
          {info.label}
        </div>
      </div>

      <p className="mt-6 max-w-xs text-sm text-gray-soft">{info.sub}</p>

      {player.final_position != null && (
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-gold">
          Posição final: {player.final_position}º
        </p>
      )}

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-mid">
        Rebuys usados: {player.rebuys_used}
      </p>
    </main>
  );
}
