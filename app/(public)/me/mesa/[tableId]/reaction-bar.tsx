"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

const REACTIONS = [
  { emoji: "😭", label: "Perdi" },
  { emoji: "🔥", label: "Mandei bem" },
  { emoji: "💪", label: "Vamo" },
  { emoji: "😱", label: "Não acredito" },
] as const;

const THROTTLE_MS = 1500;

export function ReactionBar({
  onReact,
  disabled,
}: {
  onReact: (emoji: string) => void;
  disabled?: boolean;
}) {
  const lastSentAt = useRef<number>(0);

  function handle(emoji: string) {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastSentAt.current < THROTTLE_MS) return;
    lastSentAt.current = now;
    onReact(emoji);
  }

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {REACTIONS.map((r) => (
        <Button
          key={r.emoji}
          variant="ghost"
          size="icon-lg"
          onClick={() => handle(r.emoji)}
          disabled={disabled}
          aria-label={r.label}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "rgba(212,175,55,0.3)",
          }}
          className="h-14 w-full rounded-2xl border border-line bg-ink-2 text-3xl transition-all active:scale-90 [&_*]:pointer-events-none"
        >
          {r.emoji}
        </Button>
      ))}
    </div>
  );
}
