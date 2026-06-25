"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  flagEmoji,
  searchCountries,
  type Country,
} from "@/app/(public)/inscrever/countries";

export type PhoneValue = { e164: string; iso2: string; valid: boolean };

function buildValue(country: Country, national: string): PhoneValue {
  const digits = national.replace(/\D/g, "");
  const total = country.dial.length + digits.length;
  const valid = digits.length >= 6 && total <= 17;
  return { e164: digits ? `+${country.dial}${digits}` : "", iso2: country.iso2, valid };
}

/** Versão do PhoneInput com a pele creme/vermelha da LP de ingressos. */
export function PhoneInputCream({
  onChange,
  invalid,
}: {
  onChange: (v: PhoneValue) => void;
  invalid?: boolean;
}) {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    onChange(buildValue(country, national));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, national]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          "flex items-stretch overflow-hidden rounded-xl border-2 bg-cream-2/60 transition-colors focus-within:border-red-brand",
          invalid ? "border-red-brand" : "border-cream-3",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`País: ${country.name} (+${country.dial})`}
          className="flex shrink-0 items-center gap-1.5 border-r-2 border-cream-3 bg-cream px-3 text-ink-warm transition-colors hover:bg-cream-2 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">{flagEmoji(country.iso2)}</span>
          <span className="font-mono text-sm tabular-nums text-ink-warm">+{country.dial}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-ink-warm-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => setNational(e.target.value.replace(/[^\d\s()-]/g, ""))}
          placeholder="Número com DDD"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-base text-ink-warm placeholder:text-ink-warm-soft/60 focus:outline-none"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border-2 border-cream-3 bg-cream shadow-[0_18px_50px_rgba(27,23,20,0.25)]">
          <div className="flex items-center gap-2 border-b border-cream-3 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-ink-warm-soft" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país ou DDI…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink-warm placeholder:text-ink-warm-soft/60 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="text-ink-warm-soft hover:text-ink-warm">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-warm-soft">Nenhum país encontrado.</li>
            )}
            {results.map((c) => {
              const selected = c.iso2 === country.iso2;
              return (
                <li key={c.iso2} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      setCountry(c);
                      close();
                    }}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected ? "bg-red-brand/10 text-ink-warm" : "text-ink-warm-soft hover:bg-cream-2 hover:text-ink-warm",
                    ].join(" ")}
                  >
                    <span className="text-lg leading-none">{flagEmoji(c.iso2)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <span className="font-mono text-xs tabular-nums text-ink-warm-soft">+{c.dial}</span>
                    {selected && <Check className="h-4 w-4 text-red-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-cream-3 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-warm-soft">
            {COUNTRIES.length} países
          </div>
        </div>
      )}
    </div>
  );
}
