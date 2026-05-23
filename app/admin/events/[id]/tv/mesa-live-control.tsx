"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Play, Pause, FastForward, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { calculateTimeRemainingMs } from "@/lib/timer/calculate";
import { formatTime } from "@/lib/timer/format";
import {
  pauseMatch,
  resumeMatch,
  advanceLevel,
  adjustMatchTime,
  resetMatchTimer,
  resetTable,
} from "@/lib/tournament/matches";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/lib/types/database.types";

type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

/**
 * Cronômetro vivo + controles da mesa na tela de Configuração da TV.
 * - Subscribe Realtime no match desta mesa pra refletir pause/resume/advance
 *   feitos por outro admin em outra aba.
 * - setInterval só força re-render do display — cálculo vem do servidor.
 */
export function MesaLiveControl({
  table,
  match: initialMatch,
  currentLevel: initialLevel,
  levels,
  autoAdvance = false,
}: {
  table: PhysicalTable;
  match: Match | undefined;
  currentLevel: BlindLevel | undefined;
  levels: BlindLevel[];
  autoAdvance?: boolean;
}) {
  const router = useRouter();
  // Realtime override: vence o prop quando o ID bate. Caso prop mude (ex.: nova
  // partida criada por outro caminho), o override fica stale e o prop volta a valer.
  const [override, setOverride] = useState<Match | null>(null);
  const match =
    override && initialMatch && override.id === initialMatch.id ? override : initialMatch;
  const matchId = match?.id;
  const matchState = match?.state;

  const [, setTick] = useState(0);
  const [pendingAdjust, startAdjust] = useTransition();
  const [pendingPauseResume, startPauseResume] = useTransition();
  const [pendingAdvance, startAdvance] = useTransition();
  const [pendingReset, startReset] = useTransition();
  const [pendingResetTable, startResetTable] = useTransition();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref pra garantir só 1 auto-advance por nível
  const autoAdvancedFor = useRef<string | null>(null);

  // Tick visual a cada 1s enquanto JOGANDO
  useEffect(() => {
    if (matchState !== "JOGANDO") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [matchState]);

  // Subscribe Realtime no match desta mesa
  useEffect(() => {
    if (!matchId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`tv-config-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => setOverride(payload.new as Match),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Calcula nível atual da memória local (atualiza quando match.current_level_id muda)
  const currentLevel =
    match && match.current_level_id
      ? levels.find((l) => l.id === match.current_level_id) ?? initialLevel
      : initialLevel;

  // V1.3: auto-advance quando cronômetro expira (precisa estar antes do early
  // return pra respeitar hook order). Verifica conditions dentro do effect.
  // setTick triggera re-renders a cada 1s; quando isExpired vira true, este
  // effect re-roda e schedula o advance se autoAdvance estiver ligado.
  const autoCanRun =
    autoAdvance &&
    !!match &&
    !!currentLevel &&
    match.state === "JOGANDO" &&
    calculateTimeRemainingMs(match, currentLevel) < 0;
  const autoLevelId = currentLevel?.id ?? null;
  useEffect(() => {
    if (!autoCanRun || !autoLevelId || !match) return;
    if (autoAdvancedFor.current === autoLevelId) return;
    autoAdvancedFor.current = autoLevelId;
    // 2s de carência — admin vê o "expirado" brevemente antes do auto-advance
    const matchIdLocal = match.id;
    const t = setTimeout(() => {
      advanceLevel(matchIdLocal).catch(() => {
        // Falha silenciosa — Realtime ainda pode sincronizar; admin pode advance manual
        autoAdvancedFor.current = null;
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [autoCanRun, autoLevelId, match]);

  // Estado LIVRE — nenhum match ainda
  if (!match || !currentLevel) {
    return (
      <div className="rounded-md border border-dashed border-line bg-ink p-4 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          Mesa aberta · aguardando alguém entrar pelo /me
        </span>
      </div>
    );
  }

  const remainingMs = calculateTimeRemainingMs(match, currentLevel);
  const isExpired = remainingMs < 0;
  const isPaused = match.state === "PAUSADA";

  function handleAdjust(delta: number) {
    if (!match) return;
    startAdjust(async () => {
      try {
        await adjustMatchTime({ matchId: match.id, deltaSeconds: delta });
        // realtime atualiza o match; router.refresh garante consistência em outros
        // componentes server-rendered
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handlePauseResume() {
    if (!match) return;
    startPauseResume(async () => {
      try {
        if (isPaused) {
          await resumeMatch(match.id);
          toast.success("Mesa retomada");
        } else {
          await pauseMatch(match.id);
          toast.success("Mesa pausada");
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleAdvance() {
    if (!match) return;
    startAdvance(async () => {
      try {
        const res = await advanceLevel(match.id);
        toast.success(res.advanced ? "Próximo nível" : "Último nível — não há próximo");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleReset() {
    if (!match) return;
    startReset(async () => {
      try {
        await resetMatchTimer(match.id);
        toast.success("Cronômetro reiniciado");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleResetTable() {
    startResetTable(async () => {
      try {
        await resetTable(table.id);
        toast.success("Mesa reiniciada");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Cronômetro grande */}
      <div className="rounded-lg border border-line bg-ink p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Nível {currentLevel.level_number}
            </div>
            <div className="font-mono text-xs text-gray-soft">
              SB {currentLevel.small_blind.toLocaleString("pt-BR")} · BB{" "}
              {currentLevel.big_blind.toLocaleString("pt-BR")}
              {currentLevel.ante > 0 && (
                <> · Ante {currentLevel.ante.toLocaleString("pt-BR")}</>
              )}
            </div>
          </div>
          {isPaused && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker">
              Pausada
            </span>
          )}
        </div>

        <div
          className={`mt-2 font-mono text-5xl leading-none tabular-nums sm:text-6xl ${
            isPaused || isExpired ? "text-red-poker" : "text-paper"
          }`}
        >
          {formatTime(remainingMs)}
        </div>

        {isExpired && !isPaused && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker">
            {autoAdvance
              ? "Acabou o tempo — avançando automaticamente…"
              : "Acabou o tempo — aperte “Próximo nível”"}
          </div>
        )}
      </div>

      {/* Ajuste fino do cronômetro */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleAdjust(-60)}
          disabled={pendingAdjust}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden />
          1 min
        </button>
        <button
          type="button"
          onClick={() => handleAdjust(60)}
          disabled={pendingAdjust}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          1 min
        </button>
      </div>

      {/* Reiniciar cronômetro do nível atual (com confirmação) */}
      <AlertDialog>
        <AlertDialogTrigger
          disabled={pendingReset}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden />
          {pendingReset ? "Reiniciando…" : "Reiniciar cronômetro"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar cronômetro?</AlertDialogTitle>
            <AlertDialogDescription>
              O nível {currentLevel.level_number} volta pra duração cheia (
              {currentLevel.duration_minutes} min). O nível não muda. Ação não
              tem undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={pendingReset}>
              {pendingReset ? "Reiniciando…" : "Reiniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause/resume + advance */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handlePauseResume}
          disabled={pendingPauseResume}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
        >
          {isPaused ? (
            <>
              <Play className="size-4" aria-hidden />
              {pendingPauseResume ? "Retomando…" : "Retomar"}
            </>
          ) : (
            <>
              <Pause className="size-4" aria-hidden />
              {pendingPauseResume ? "Pausando…" : "Pausar"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleAdvance}
          disabled={pendingAdvance}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-gold text-sm font-medium text-ink transition-colors hover:bg-gold/90 disabled:opacity-40"
        >
          <FastForward className="size-4" aria-hidden />
          {pendingAdvance ? "Avançando…" : "Próximo nível"}
        </button>
      </div>

      {/* Zona destrutiva — reinicia a mesa do zero */}
      <AlertDialog>
        <AlertDialogTrigger
          disabled={pendingResetTable}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-poker/40 bg-red-poker/5 text-sm text-red-poker transition-colors hover:bg-red-poker/10 disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden />
          {pendingResetTable ? "Reiniciando…" : "Reiniciar mesa"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar mesa {table.table_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              A partida atual é encerrada sem vencedor. Quem está jogando aqui
              volta pra &ldquo;Presente&rdquo;. Eliminados anteriores ficam de
              fora. O próximo a entrar pelo /me começa uma partida nova no
              nível 1. Ação não tem undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetTable}
              disabled={pendingResetTable}
              className="bg-red-poker text-white hover:bg-red-poker/90"
            >
              {pendingResetTable ? "Reiniciando…" : "Reiniciar mesa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
