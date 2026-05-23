"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { playSynth } from "@/lib/audio/synth";
import type { Tables } from "@/lib/types/database.types";

type PlayerInfo = { name: string; nickname: string | null; avatarUrl: string | null };

type ChipDisplay = Tables<"chip_displays">;

type QueueItem = {
  id: string;
  playerName: string;
  nickname: string | null;
  amount: number;
  avatarUrl: string | null;
};

const DISPLAY_MS = 15000;
const FRESH_AGE_MS = 15000;

/**
 * V1.3 — Overlay "mostrar fichas" da TV.
 *
 * Duas fontes de evento, deduplicadas por seenIds:
 *   1. Realtime INSERT em chip_displays — caso a TV já estava aberta.
 *   2. Fetch inicial na montagem — caso a TV abriu DEPOIS do clique.
 *
 * Timer de auto-dismiss é por currentId — adicionar à fila NÃO reseta o atual.
 */
export function ChipDisplayOverlay({
  eventId,
  playersById,
}: {
  eventId: string;
  playersById: Map<string, PlayerInfo>;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const playersByIdRef = useRef(playersById);
  useEffect(() => {
    playersByIdRef.current = playersById;
  }, [playersById]);

  function enqueueIfFresh(row: Pick<ChipDisplay, "id" | "player_id" | "amount" | "created_at">) {
    if (seenIds.current.has(row.id)) return;
    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (ageMs > FRESH_AGE_MS) return;
    seenIds.current.add(row.id);
    const player = playersByIdRef.current.get(row.player_id);
    setQueue((prev) => [
      ...prev,
      {
        id: row.id,
        playerName: player?.name ?? "Jogador",
        nickname: player?.nickname ?? null,
        amount: row.amount,
        avatarUrl: player?.avatarUrl ?? null,
      },
    ]);
  }

  useEffect(() => {
    const supabase = createClient();

    async function fetchRecent() {
      const cutoff = new Date(Date.now() - FRESH_AGE_MS).toISOString();
      const { data } = await supabase
        .from("chip_displays")
        .select("id, player_id, amount, created_at")
        .eq("event_id", eventId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true });
      for (const row of data ?? []) enqueueIfFresh(row);
    }

    // Primeiro fetch imediato (caso TV abriu depois do clique)
    fetchRecent();

    // Fallback: poll a cada 3s. Realtime é primário; o poll garante que o
    // overlay aparece mesmo se a conexão WebSocket caiu. seenIds dedup.
    const pollId = setInterval(fetchRecent, 3000);

    const channel = supabase
      .channel(`chip-display-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chip_displays",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => enqueueIfFresh(payload.new as ChipDisplay),
      )
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const currentId = queue[0]?.id;
  // Toca o som quando o card APARECE (não quando entra na fila) — sincroniza
  // com a animação visual. Auto-dismiss depois de DISPLAY_MS.
  useEffect(() => {
    if (!currentId) return;
    playSynth("chip-show", 0.9);
    const t = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [currentId]);

  const current = queue[0];
  const remaining = useMemo(() => queue.length - 1, [queue]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden animate-chip-overlay-life"
      aria-live="polite"
      key={current.id}
    >
      {/* Camada 1: chuva de fichas no fundo (TV continua visível atrás) */}
      <ChipRain seed={current.id} />

      {/* Camada 2: card no canto com perfil + valor */}
      <div className="absolute right-8 top-8 max-w-sm sm:right-12 sm:top-12">
        {/* glow atrás do card */}
        <div className="absolute -inset-2 rounded-2xl bg-gold/15 blur-2xl" aria-hidden />

        <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-ink-2/95 p-5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-6">
          {/* Header: avatar + nome */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 -m-1 rounded-full bg-gold/30 blur-md" aria-hidden />
              <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-full border border-gold bg-gold/10 font-display text-2xl font-light text-gold sm:size-16 sm:text-3xl">
                {current.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.avatarUrl}
                    alt={current.playerName}
                    className="size-full object-cover"
                  />
                ) : (
                  current.playerName.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-xl font-light leading-tight text-paper sm:text-2xl">
                {current.playerName}
              </h2>
              {current.nickname && (
                <p className="truncate font-display text-sm italic text-gold sm:text-base">
                  {current.nickname}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 h-px w-full bg-gold/20" aria-hidden />

          {/* Amount em destaque */}
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70">
              Fichas
            </span>
            <div className="font-display text-5xl font-light leading-none tabular-nums tracking-tight text-gold drop-shadow-[0_0_18px_rgba(212,175,55,0.5)] sm:text-6xl animate-amount-pulse">
              {current.amount.toLocaleString("pt-BR")}
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-line/40">
            <div
              className="h-full bg-gold"
              style={{ animation: `chip-display-bar ${DISPLAY_MS}ms linear forwards` }}
            />
          </div>

        </div>

        {/* Fila — preview dos próximos que pediram pra mostrar */}
        {remaining > 0 && (
          <div className="mt-3 rounded-xl border border-line bg-ink-2/95 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold/70">
                Na fila
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                {remaining}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {queue.slice(1, 4).map((q) => (
                <li key={q.id} className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/30 bg-ink font-display text-xs font-light text-gold">
                    {q.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={q.avatarUrl} alt={q.playerName} className="size-full object-cover" />
                    ) : (
                      q.playerName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="flex-1 truncate text-xs text-paper">
                    {q.playerName.split(" ")[0]}
                  </span>
                  <span className="shrink-0 font-display text-sm tabular-nums text-gold">
                    {q.amount.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
              {remaining > 3 && (
                <li className="pt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
                  +{remaining - 3} esperando…
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        @keyframes chip-display-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
        /* Lifecycle do overlay inteiro (card + chip rain) — fade in suave,
           visível, fade out suave. Sem snap visual no início nem no fim. */
        @keyframes chip-overlay-life {
          0% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          5% { opacity: 1; transform: translateY(0) scale(1); }
          94% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-4px) scale(0.99); }
        }
        .animate-chip-overlay-life {
          animation: chip-overlay-life 15s cubic-bezier(0.4, 0, 0.2, 1) both;
          transform-origin: top right;
        }
        @keyframes amount-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-amount-pulse {
          animation: amount-pulse 2.6s ease-in-out infinite;
        }
        @keyframes chip-fall {
          0% { transform: translate3d(0, -20vh, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translate3d(var(--drift, 0px), 120vh, 0) rotate(var(--spin, 720deg)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
 * Animações decorativas — chips falling + burst
 * ============================================================ */

type ChipDef = { v: number; bg: string; inner: string; text: string };

// V1.3: alinhado com chip-calculator (100/500/1000/5000/25000).
// Cores espelham o componente do player pra consistência visual.
const CHIP_DEFS: ChipDef[] = [
  { v: 100, bg: "#0a0a0a", inner: "rgba(212,175,55,0.6)", text: "#d4af37" },
  { v: 500, bg: "#6d28d9", inner: "rgba(255,255,255,0.5)", text: "#fff" },
  { v: 1000, bg: "#f59e0b", inner: "rgba(28,25,23,0.4)", text: "#1c1917" },
  { v: 5000, bg: "#be123c", inner: "rgba(255,255,255,0.5)", text: "#fff" },
  { v: 25000, bg: "#0284c7", inner: "rgba(255,255,255,0.5)", text: "#fff" },
];

/** Hash determinístico de string pra seed numérico estável por display. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gerador pseudo-aleatório com seed (mulberry32). */
function rng(seed: number) {
  let t = seed;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function Chip({ def, size }: { def: ChipDef; size: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full font-bold shadow-lg"
      style={{
        width: size,
        height: size,
        background: def.bg,
        fontSize: size * 0.34,
        border: def.v === 100 ? "2px solid #d4af37" : undefined,
      }}
      aria-hidden
    >
      <span
        className="absolute rounded-full border-2 border-dashed"
        style={{
          inset: size * 0.12,
          borderColor: def.inner,
        }}
      />
      <span className="relative" style={{ color: def.text }}>
        {def.v >= 1000 ? `${def.v / 1000}K` : def.v}
      </span>
    </span>
  );
}

/** Chuva contínua de fichas caindo, atrás do conteúdo principal. */
function ChipRain({ seed }: { seed: string }) {
  const chips = useMemo(() => {
    const r = rng(hash(seed));
    const N = 30;
    return Array.from({ length: N }, (_, i) => {
      const def = CHIP_DEFS[Math.floor(r() * CHIP_DEFS.length)]!;
      const size = 36 + Math.floor(r() * 36); // 36–72px
      const left = r() * 100; // 0–100% horizontal
      const duration = 5000 + Math.floor(r() * 5000); // 5–10s
      const delay = -Math.floor(r() * duration); // negativo: já em curso
      const drift = (r() - 0.5) * 200; // -100 a +100 px lateralmente
      const spin = (r() * 720 + 360) * (r() > 0.5 ? 1 : -1); // ±360 a ±1080deg
      return { id: i, def, size, left, duration, delay, drift, spin };
    });
  }, [seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {chips.map((c) => (
        <span
          key={c.id}
          className="absolute"
          style={{
            left: `${c.left}%`,
            top: 0,
            animation: `chip-fall ${c.duration}ms linear ${c.delay}ms infinite`,
            // CSS custom props consumidas pelo keyframe
            ["--drift" as string]: `${c.drift}px`,
            ["--spin" as string]: `${c.spin}deg`,
          }}
        >
          <Chip def={c.def} size={c.size} />
        </span>
      ))}
    </div>
  );
}

