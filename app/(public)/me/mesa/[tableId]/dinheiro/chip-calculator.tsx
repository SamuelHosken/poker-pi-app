"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser, Eye, Minus } from "lucide-react";
import { requestChipDisplay } from "@/lib/tournament/player-actions";

type Denomination = 1 | 5 | 10 | 25 | 50 | 100;

type ChipMeta = {
  value: Denomination;
  // Cores no padrão de fichas de torneio
  ring: string; // anel externo
  inner: string; // contorno interno tracejado
  text: string; // cor do número
};

const CHIPS: ChipMeta[] = [
  { value: 1, ring: "bg-stone-200", inner: "border-stone-500/40", text: "text-ink" },
  { value: 5, ring: "bg-red-700", inner: "border-white/50", text: "text-white" },
  { value: 10, ring: "bg-blue-700", inner: "border-white/50", text: "text-white" },
  { value: 25, ring: "bg-emerald-700", inner: "border-white/50", text: "text-white" },
  { value: 50, ring: "bg-orange-600", inner: "border-white/50", text: "text-white" },
  { value: 100, ring: "bg-black border-2 border-gold", inner: "border-gold/40", text: "text-gold" },
];

export function ChipCalculator({ tableId }: { tableId: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<Denomination, number>>({
    1: 0,
    5: 0,
    10: 0,
    25: 0,
    50: 0,
    100: 0,
  });
  const [pulse, setPulse] = useState<Denomination | null>(null);
  const [pending, startTransition] = useTransition();
  // Dedup de incremento entre onClick + onPointerUp (ambos disparam no touch)
  const lastAddAt = useRef<{ val: Denomination; ts: number } | null>(null);

  const total = (Object.entries(counts) as [string, number][]).reduce(
    (acc, [val, n]) => acc + Number(val) * n,
    0,
  );

  function add(val: Denomination) {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const last = lastAddAt.current;
    // Mesma ficha tocada em < 80ms = dupe entre handlers; ignora
    if (last && last.val === val && now - last.ts < 80) return;
    lastAddAt.current = { val, ts: now };
    setCounts((prev) => ({ ...prev, [val]: prev[val] + 1 }));
    setPulse(val);
    setTimeout(() => setPulse((cur) => (cur === val ? null : cur)), 250);
  }

  function sub(val: Denomination) {
    setCounts((prev) => ({ ...prev, [val]: Math.max(0, prev[val] - 1) }));
  }

  function clearAll() {
    setCounts({ 1: 0, 5: 0, 10: 0, 25: 0, 50: 0, 100: 0 });
  }

  function show() {
    if (total <= 0) {
      toast.error("Adicione fichas antes de mostrar.");
      return;
    }
    // Optimistic: navega de volta pra mesa já + dispara o display.
    // Toast aparece depois; erro reverte (mostra apenas o toast, fica em /me/mesa).
    router.push(`/me/mesa/${tableId}`);
    startTransition(async () => {
      try {
        await requestChipDisplay({ amount: total });
        toast.success("Mostrando na TV por 15s");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  const stacks = CHIPS.filter((c) => counts[c.value] > 0);

  return (
    <div className="mt-6 flex flex-1 flex-col gap-6 sm:mt-8">
      {/* Pile / total */}
      <div className="space-y-4 rounded-2xl border border-line bg-ink-2 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold/70">
            Total
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
            {stacks.length === 0
              ? "vazio"
              : `${stacks.reduce((a, c) => a + counts[c.value], 0)} fichas`}
          </span>
        </div>

        <div className="text-center">
          <span className="font-display text-6xl font-light leading-none tracking-tight text-paper sm:text-7xl">
            {total.toLocaleString("pt-BR")}
          </span>
        </div>

        {/* Breakdown — uma linha por denominação ativa */}
        {stacks.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-ink/40 px-4 py-6 text-center font-mono text-xs text-gray-soft">
            Toque nas fichas abaixo pra somar
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stacks.map((c) => (
              <li
                key={c.value}
                className="flex items-center gap-3 rounded-md border border-line bg-ink px-2 py-1.5"
              >
                <ChipVisual chip={c} small />
                <div className="font-mono text-xs text-gray-soft">
                  × <span className="text-paper">{counts[c.value]}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-display text-base font-light text-paper">
                    {(c.value * counts[c.value]).toLocaleString("pt-BR")}
                  </span>
                  <button
                    type="button"
                    onClick={() => sub(c.value)}
                    aria-label={`Tirar uma ficha ${c.value}`}
                    style={{ touchAction: "manipulation" }}
                    className="flex size-11 items-center justify-center rounded-md border border-line text-gray-soft transition-colors hover:border-red-poker/40 hover:text-red-poker active:scale-95"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chip palette */}
      <div className="space-y-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Toque pra somar
        </span>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => add(c.value)}
              onPointerUp={(e) => {
                // iOS Safari às vezes engole o onClick depois de mostrar o :active.
                // onPointerUp dispara confiavelmente; só rodamos se for touch
                // (evitamos duplicar pra mouse, que já tem onClick).
                if (e.pointerType === "touch") add(c.value);
              }}
              aria-label={`Adicionar ficha ${c.value}`}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(212,175,55,0.3)",
                WebkitTouchCallout: "none",
              }}
              className="group relative flex aspect-square w-full cursor-pointer select-none items-center justify-center rounded-2xl bg-ink-2/40 p-2 transition-transform active:scale-95 [&_*]:pointer-events-none"
            >
              <ChipVisual chip={c} pulse={pulse === c.value} />
            </button>
          ))}
        </div>
      </div>

      {/* Ações: limpar + mostrar */}
      <div className="mt-auto grid w-full grid-cols-[1fr_2fr] gap-2">
        <button
          type="button"
          onClick={clearAll}
          disabled={pending || total === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-ink-2 text-sm text-gray-soft transition-colors hover:border-red-poker/40 hover:text-red-poker disabled:opacity-40"
        >
          <Eraser className="size-4" aria-hidden />
          Limpar
        </button>
        <button
          type="button"
          onClick={show}
          disabled={pending || total <= 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gold text-sm font-medium text-ink transition-colors hover:bg-gold/90 disabled:opacity-40"
        >
          <Eye className="size-4" aria-hidden />
          {pending ? "Enviando…" : "Mostrar na TV"}
        </button>
      </div>
    </div>
  );
}

function ChipVisual({
  chip,
  small,
  pulse,
}: {
  chip: ChipMeta;
  small?: boolean;
  pulse?: boolean;
}) {
  const size = small ? "size-9 text-xs" : "size-16 text-lg sm:size-20 sm:text-xl";
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full font-bold shadow-lg ${chip.ring} ${size} ${
        pulse ? "ring-4 ring-gold/60" : ""
      }`}
      style={{ transition: "box-shadow 200ms ease-out" }}
    >
      <span
        className={`absolute inset-[12%] rounded-full border-2 border-dashed ${chip.inner}`}
        aria-hidden
      />
      <span className={`relative ${chip.text}`}>{chip.value}</span>
    </span>
  );
}
