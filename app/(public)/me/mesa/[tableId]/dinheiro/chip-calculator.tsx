"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser, Eye, Minus } from "lucide-react";
import { requestChipDisplay } from "@/lib/tournament/player-actions";
import { CHIP_VERSION } from "@/lib/chip-version";

// V1.3 — Fichas da casa (atualizado). Bump CHIP_VERSION em lib/chip-version.ts
// SEMPRE que mexer aqui pra forçar reload nos clientes com a página aberta.
type Denomination = 100 | 500 | 1000 | 5000 | 25000;

type ChipMeta = {
  value: Denomination;
  ring: string; // anel externo (bg)
  inner: string; // contorno interno tracejado
  text: string; // cor do número
};

// Cores escolhidas pra ficarem distintas em torneio:
// 100 = preto com borda gold (premium)
// 500 = roxo / violeta
// 1000 = amarelo / âmbar
// 5000 = rosa-vermelho / magenta
// 25000 = azul céu
const CHIPS: ChipMeta[] = [
  { value: 100, ring: "bg-black border-2 border-gold", inner: "border-gold/40", text: "text-gold" },
  { value: 500, ring: "bg-violet-700", inner: "border-white/50", text: "text-white" },
  { value: 1000, ring: "bg-amber-500", inner: "border-ink/40", text: "text-ink" },
  { value: 5000, ring: "bg-rose-700", inner: "border-white/50", text: "text-white" },
  { value: 25000, ring: "bg-sky-600", inner: "border-white/50", text: "text-white" },
];

const ZERO_COUNTS: Record<Denomination, number> = {
  100: 0,
  500: 0,
  1000: 0,
  5000: 0,
  25000: 0,
};

export function ChipCalculator({ tableId }: { tableId: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<Denomination, number>>(ZERO_COUNTS);
  const [pulse, setPulse] = useState<Denomination | null>(null);
  const [pending, startTransition] = useTransition();
  // Dedup de incremento entre onClick + onPointerUp (ambos disparam no touch)
  const lastAddAt = useRef<{ val: Denomination; ts: number } | null>(null);

  // Auto-reload se o servidor reportar uma versão de ficha diferente da
  // que esse bundle conhece. Funciona pra todo cliente com a página aberta
  // — em até 15s eles refrescam sozinhos depois de deploy.
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/chip-version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (mounted && data.version && data.version !== CHIP_VERSION) {
          window.location.reload();
        }
      } catch {
        /* offline / falha: tenta de novo no próximo intervalo */
      }
    }
    check();
    const id = setInterval(check, 15_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

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
    setCounts(ZERO_COUNTS);
  }

  function show() {
    if (total <= 0) {
      toast.error("Adicione fichas antes de mostrar.");
      return;
    }
    // IMPORTANTE: insere ANTES de navegar. Se navegarmos primeiro o browser
    // pode cancelar a Server Action em vôo (e o display não chega na TV).
    startTransition(async () => {
      try {
        await requestChipDisplay({ amount: total, tableId });
        toast.success("Mostrando na TV por 15s");
        router.push(`/me/mesa/${tableId}`);
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
      <span className={`relative ${chip.text}`}>{formatChip(chip.value)}</span>
    </span>
  );
}

/** Encurta valores ≥ 1000 pra "1K", "5K", "25K" — caber dentro da ficha. */
function formatChip(v: number): string {
  if (v >= 1000) return `${v / 1000}K`;
  return String(v);
}
