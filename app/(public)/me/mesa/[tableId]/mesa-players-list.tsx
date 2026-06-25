"use client";

import { AvatarImage } from "@/components/ui/avatar-image";
import { Card, CardContent } from "@/components/ui/card";

type Seat = {
  participationId: string;
  playerId: string;
  name: string;
  nickname?: string | null;
  seatNumber: number | null;
  isYou: boolean;
  avatarUrl?: string | null;
  eliminationCount?: number;
};

export function MesaPlayersList({ seats }: { seats: Seat[] }) {
  const count = seats.length;

  return (
    <div className="w-full space-y-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
        Na mesa · {count}
      </span>

      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-ink-2 px-4 py-6 text-center font-mono text-xs text-gray-soft">
          Mesa vazia. Você é o primeiro!
        </p>
      ) : (
        <ul className="space-y-1.5">
          {seats.map((s) => (
            <li key={s.participationId}>
              <Card
                size="sm"
                className={`flex-row items-center gap-3 py-2.5 px-3 ${
                  s.isYou ? "border-gold/40 bg-gold/5" : ""
                }`}
              >
                <AvatarImage
                  name={s.name}
                  url={s.avatarUrl}
                  size="sm"
                  variant={s.isYou ? "gold" : "outline"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm text-paper">
                    {s.name}
                    {s.isYou && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                        Você
                      </span>
                    )}
                  </div>
                  {s.nickname && (
                    <div className="truncate font-display text-xs italic text-gold">
                      {s.nickname}
                    </div>
                  )}
                </div>
                {s.seatNumber != null && (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    #{s.seatNumber}
                  </span>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
