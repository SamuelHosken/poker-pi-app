"use client";
import { Check } from "lucide-react";
import type { TicketType } from "@/lib/tickets/types";

function price(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function features(name: string): string[] {
  if (/open\s*bar/i.test(name)) {
    return ["Entrada no torneio", "Jantar completo", "Open Bar a noite toda", "1 rebuy incluso"];
  }
  return ["Entrada no torneio", "Jantar completo", "Bebidas não alcoólicas", "1 rebuy incluso"];
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
    <div className="grid gap-4 sm:grid-cols-2">
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
              "relative flex flex-col rounded-3xl border-2 p-6 text-left transition-all",
              active
                ? "border-red-brand bg-cream shadow-[0_18px_44px_-18px_rgba(216,58,28,0.7)]"
                : "border-cream-3 bg-cream-2 hover:border-red-brand/60",
            ].join(" ")}
          >
            {openBar && (
              <span className="absolute right-4 top-4 rounded-full bg-red-brand px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wide text-cream">
                Completo
              </span>
            )}

            <span className="font-condensed text-xl font-bold uppercase tracking-wide text-red-brand">{t.name}</span>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-condensed text-2xl font-bold text-ink-warm">R$</span>
              <span className="font-condensed text-6xl font-extrabold leading-none text-ink-warm">{price(t.priceCents)}</span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {features(t.name).map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink-warm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-brand text-cream">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <span
              className={[
                "mt-6 inline-flex h-11 items-center justify-center rounded-full font-condensed text-base font-bold uppercase tracking-wide transition-colors",
                active ? "bg-red-brand text-cream" : "border-2 border-ink-warm text-ink-warm",
              ].join(" ")}
            >
              {active ? "Selecionado" : "Escolher"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
