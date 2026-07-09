"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  flagEmoji,
  searchCountries,
  type Country,
} from "./countries";

export type PhoneValue = {
  /** E.164 completo, ex.: "+5561999998888" (vazio se incompleto). */
  e164: string;
  /** ISO-2 do país selecionado, ex.: "BR". */
  iso2: string;
  /** True quando há dígitos suficientes pra ser um número plausível. */
  valid: boolean;
};

function buildValue(country: Country, national: string): PhoneValue {
  const digits = national.replace(/\D/g, "");
  const total = country.dial.length + digits.length;
  const valid = digits.length >= 6 && total <= 17;
  return {
    e164: digits ? `+${country.dial}${digits}` : "",
    iso2: country.iso2,
    valid,
  };
}

export function PhoneInput({
  onChange,
  invalid,
  inputId,
}: {
  onChange: (v: PhoneValue) => void;
  invalid?: boolean;
  inputId?: string;
}) {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchCountries(query), [query]);

  // Emite o valor sempre que país ou número mudam.
  useEffect(() => {
    onChange(buildValue(country, national));
    // onChange é estável o suficiente no uso; evitamos colocá-lo na dep pra
    // não re-emitir à toa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, national]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Foca a busca ao abrir.
  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  function pick(c: Country) {
    setCountry(c);
    close();
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          "flex items-stretch overflow-hidden rounded-xl border bg-ink-warm-2/60 transition-colors focus-within:border-red-bright focus-within:ring-1 focus-within:ring-red-bright/40",
          invalid ? "border-red-bright/70" : "border-white/10",
        ].join(" ")}
      >
        {/* Seletor de país */}
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`País: ${country.name} (+${country.dial})`}
          className="flex shrink-0 items-center gap-1.5 border-r border-white/10 bg-black/25 px-3 text-cream transition-colors hover:bg-ink-warm-2 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">{flagEmoji(country.iso2)}</span>
          <span className="font-mono text-sm tabular-nums text-cream">
            +{country.dial}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-cream-soft transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Número local */}
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => setNational(e.target.value.replace(/[^\d\s()-]/g, ""))}
          placeholder="Número com DDD"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-base text-cream placeholder:text-cream-soft focus:outline-none"
        />
      </div>

      {/* Dropdown de países */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-white/10 bg-ink-warm-2 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-cream-soft" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país ou DDI…"
              className="min-w-0 flex-1 bg-transparent text-sm text-cream placeholder:text-cream-soft focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="text-cream-soft hover:text-cream"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-cream-soft">
                Nenhum país encontrado.
              </li>
            )}
            {results.map((c) => {
              const selected = c.iso2 === country.iso2;
              return (
                <li key={c.iso2} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-red-bright/10 text-cream"
                        : "text-cream-soft hover:bg-white/5 hover:text-cream",
                    ].join(" ")}
                  >
                    <span className="text-lg leading-none">
                      {flagEmoji(c.iso2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {c.name}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-cream-soft">
                      +{c.dial}
                    </span>
                    {selected && <Check className="h-4 w-4 text-red-bright" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-white/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream-soft">
            {COUNTRIES.length} países
          </div>
        </div>
      )}
    </div>
  );
}
