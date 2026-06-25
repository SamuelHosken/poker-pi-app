"use client";
import type { TicketType } from "@/lib/tickets/types";

export function TicketCards({
  types, selectedId, onSelect,
}: {
  types: TicketType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {types.map((t) => {
        const active = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`text-left rounded-2xl border p-5 transition ${
              active ? "border-gold bg-ink-2" : "border-line bg-ink-2/40 hover:border-gold/50"
            }`}
          >
            <div className="text-gold font-semibold">{t.name}</div>
            <div className="mt-1 text-2xl font-bold text-paper">
              R$ {(t.priceCents / 100).toFixed(2).replace(".", ",")}
            </div>
            <div className="mt-2 text-sm text-gray-soft">{t.description}</div>
          </button>
        );
      })}
    </div>
  );
}
