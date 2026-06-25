"use client";
import { Check } from "lucide-react";
import type { TicketType } from "@/lib/tickets/types";

function price(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function TicketCards({
  types,
  selectedId,
  onSelect,
}: {
  types: TicketType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {types.map((t) => {
        const active = t.id === selectedId;
        const openBar = /open\s*bar/i.test(t.name);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={active}
            className={[
              "relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200",
              active
                ? "border-gold bg-gold/[0.07] ring-1 ring-gold/40 shadow-[0_14px_40px_-16px_rgba(217,184,118,0.6)]"
                : "border-line bg-ink-2/50 hover:border-gold/50",
            ].join(" ")}
          >
            {openBar && (
              <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink">
                Completo
              </span>
            )}

            <div className="flex items-center gap-2">
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                  active ? "border-gold bg-gold text-ink" : "border-gray-mid text-transparent",
                ].join(" ")}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{t.name}</span>
            </div>

            <div className="mt-3 font-display text-3xl font-light tracking-tight text-paper">
              {price(t.priceCents)}
            </div>
            {t.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-soft">{t.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
