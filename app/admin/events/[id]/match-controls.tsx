"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  pauseMatch,
  resumeMatch,
  advanceLevel,
} from "@/lib/tournament/matches";
import type { Tables } from "@/lib/types/database.types";

type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;

/**
 * V1.2: mesas funcionam como canais do Discord — pessoas entram/saem pelo /me.
 * Admin não inicia partida manualmente; a partida nasce automaticamente quando
 * o primeiro jogador entra numa mesa LIVRE (ver joinTableAsPlayer).
 *
 * Admin ainda controla o cronômetro/nível:
 * - LIVRE → mensagem "Aguardando jogadores entrarem"
 * - JOGANDO → Pausar + Avançar nível
 * - PAUSADA → Retomar
 * - FINALIZADA → badge "Mesa finalizada (histórico)"
 */
export function MatchControls({
  table,
  match,
}: {
  table: PhysicalTable;
  match: Match | undefined;
}) {
  if (table.state === "JOGANDO" && match) {
    return <PauseAndAdvanceControls matchId={match.id} />;
  }

  if (table.state === "PAUSADA" && match) {
    return <ResumeControl matchId={match.id} />;
  }

  if (table.state === "FINALIZADA") {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Mesa finalizada (histórico)
      </p>
    );
  }

  // table.state === "LIVRE" — mesa aberta, esperando alguém entrar via /me
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
      Aguardando jogadores entrarem
    </p>
  );
}

function PauseAndAdvanceControls({ matchId }: { matchId: string }) {
  const [pendingPause, startPause] = useTransition();
  const [pendingAdvance, startAdvance] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          startPause(async () => {
            try {
              await pauseMatch(matchId);
              toast.success("Partida pausada");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro");
            }
          })
        }
        disabled={pendingPause}
        className="h-11"
      >
        {pendingPause ? "Pausando…" : "Pausar"}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          startAdvance(async () => {
            try {
              const res = await advanceLevel(matchId);
              toast.success(res.advanced ? "Nível avançado" : "Último nível — sem avanço");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro");
            }
          })
        }
        disabled={pendingAdvance}
        className="h-11"
      >
        {pendingAdvance ? "Avançando…" : "Avançar nível"}
      </Button>
    </div>
  );
}

function ResumeControl({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      onClick={() =>
        startTransition(async () => {
          try {
            await resumeMatch(matchId);
            toast.success("Partida retomada");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro");
          }
        })
      }
      disabled={pending}
      className="h-11 bg-gold text-ink hover:bg-gold/90"
    >
      {pending ? "Retomando…" : "Retomar"}
    </Button>
  );
}
