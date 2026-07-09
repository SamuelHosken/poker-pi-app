"use client";
import { Check } from "lucide-react";
import type { TicketType } from "@/lib/tickets/types";

function price(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function features(name: string): string[] {
  if (/open\s*bar/i.test(name)) {
    return ["Jantar completo", "Open Bar a noite toda"];
  }
  return ["Jantar completo", "Bebidas não alcoólicas"];
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
      {types.map((t) =>
        /open\s*bar/i.test(t.name) ? (
          <OpenBarCard key={t.id} t={t} active={t.id === selectedId} onSelect={() => onSelect(t.id)} />
        ) : (
          <LightCard key={t.id} t={t} active={t.id === selectedId} onSelect={() => onSelect(t.id)} />
        ),
      )}
    </div>
  );
}

function FeatureList({ items, tone }: { items: string[]; tone: "dark" | "light" }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((f) => (
        <li
          key={f}
          className={`flex items-center gap-2.5 text-[15px] ${tone === "dark" ? "text-cream" : "text-ink-warm"}`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              tone === "dark" ? "bg-cream text-ink-warm" : "bg-red-brand text-cream"
            }`}
          >
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

function LightCard({ t, active, onSelect }: { t: TicketType; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        "relative flex flex-col rounded-3xl border-2 p-6 text-left transition-all",
        active
          ? "border-red-brand bg-cream shadow-[0_18px_44px_-18px_rgba(205,0,0,0.7)]"
          : "border-cream-3 bg-cream-2 hover:border-red-brand/60",
      ].join(" ")}
    >
      <span className="font-condensed text-xl font-bold uppercase tracking-wide text-red-brand">{t.name}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-condensed text-2xl font-bold text-ink-warm">R$</span>
        <span className="font-condensed text-6xl font-extrabold leading-none text-ink-warm">{price(t.priceCents)}</span>
      </div>
      <FeatureList items={features(t.name)} tone="light" />
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
}

function OpenBarCard({ t, active, onSelect }: { t: TicketType; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        "relative isolate flex flex-col overflow-hidden rounded-3xl border-2 p-6 text-left transition-all",
        active ? "border-red-brand shadow-[0_22px_50px_-16px_rgba(205,0,0,0.85)]" : "border-red-brand/45",
      ].join(" ")}
      style={{ backgroundColor: "#150b06" }}
    >
      {/* degradê base: luz nascendo de baixo (laranja→vermelho→escuro→preto) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 128%, #ff4a1e 0%, #cd0000 22%, #6e0000 46%, #18110b 76%)",
        }}
      />
      {/* glow animado subindo de baixo */}
      <div
        aria-hidden
        className="ob-glow absolute inset-x-0 bottom-[-25%] -z-10 h-3/4 blur-md"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(255,110,50,0.85) 0%, rgba(205,0,0,0.32) 45%, transparent 72%)",
        }}
      />

      <span className="absolute right-4 top-4 rounded-full bg-cream px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wide text-ink-warm">
        Mais completo
      </span>

      <span className="font-condensed text-xl font-bold uppercase tracking-wide text-cream">{t.name}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-condensed text-2xl font-bold text-cream">R$</span>
        <span className="font-condensed text-6xl font-extrabold leading-none text-cream">{price(t.priceCents)}</span>
      </div>
      <FeatureList items={features(t.name)} tone="dark" />
      <span
        className={[
          "mt-6 inline-flex h-11 items-center justify-center rounded-full font-condensed text-base font-bold uppercase tracking-wide transition-colors",
          active ? "bg-cream text-ink-warm" : "border-2 border-cream/70 text-cream",
        ].join(" ")}
      >
        {active ? "Selecionado" : "Escolher"}
      </span>
    </button>
  );
}
