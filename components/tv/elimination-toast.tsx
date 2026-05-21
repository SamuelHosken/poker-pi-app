"use client";

import { useEffect } from "react";

export type EliminationToastData = {
  id: string;
  playerName: string;
  nickname: string | null;
  finalPosition: number | null;
  tableNumber: number;
};

export function EliminationToast({
  data,
  onDismiss,
}: {
  data: EliminationToastData;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(data.id), 4000);
    return () => clearTimeout(t);
  }, [data.id, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-none w-80 rounded-lg border border-red-poker/40 bg-ink-2/95 px-5 py-4 shadow-2xl backdrop-blur"
      style={{
        animation: "slide-in-right 220ms ease-out forwards, fade-out 400ms 3600ms forwards",
      }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-poker">
        Eliminado
      </div>
      <div className="mt-1 font-display text-2xl font-light leading-tight text-paper">
        {data.playerName}
      </div>
      {data.nickname && (
        <div className="font-display text-sm italic text-gold">{data.nickname}</div>
      )}
      <div className="mt-1 font-mono text-xs text-gray-soft">
        Mesa {data.tableNumber}
        {data.finalPosition != null && <> · {data.finalPosition}º lugar</>}
      </div>
    </div>
  );
}
