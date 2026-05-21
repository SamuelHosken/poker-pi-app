"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  startMatchOnTable,
  pauseMatch,
  resumeMatch,
  advanceLevel,
  releaseFinishedTable,
} from "@/lib/tournament/matches";
import { startFinalMatch } from "@/lib/tournament/final-table";
import type { Tables } from "@/lib/types/database.types";

type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;
type Player = Tables<"players">;

export function MatchControls({
  table,
  match,
  presentes,
  tableSize,
}: {
  table: PhysicalTable;
  match: Match | undefined;
  presentes: Player[];
  tableSize: number;
}) {
  // Mesa final criada mas ainda não iniciada
  if (match && match.is_final_table && match.state === "LIVRE") {
    return <StartFinalMatchButton matchId={match.id} />;
  }

  if (table.state === "JOGANDO" && match) {
    return <PauseAndAdvanceControls matchId={match.id} />;
  }

  if (table.state === "PAUSADA" && match) {
    return <ResumeControl matchId={match.id} />;
  }

  if (table.state === "FINALIZADA") {
    return (
      <div className="space-y-2">
        <StartMatchControl
          physicalTableId={table.id}
          presentes={presentes}
          tableSize={tableSize}
          variant="renovate"
        />
        <ReleaseTableButton physicalTableId={table.id} />
      </div>
    );
  }

  // table.state === "LIVRE"
  return (
    <StartMatchControl
      physicalTableId={table.id}
      presentes={presentes}
      tableSize={tableSize}
      variant="start"
    />
  );
}

function StartFinalMatchButton({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      onClick={() =>
        startTransition(async () => {
          try {
            await startFinalMatch(matchId);
            toast.success("Mesa Final iniciada");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro");
          }
        })
      }
      disabled={pending}
      className="h-12 w-full bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
    >
      {pending ? "Iniciando…" : "Iniciar Mesa Final"}
    </Button>
  );
}

function StartMatchControl({
  physicalTableId,
  presentes,
  tableSize,
  variant,
}: {
  physicalTableId: string;
  presentes: Player[];
  tableSize: number;
  variant: "start" | "renovate";
}) {
  const cta = variant === "renovate" ? "Renovar mesa" : "Iniciar partida";
  const dialogTitle = variant === "renovate" ? "Renovar mesa" : "Selecionar jogadores";
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(presentes.slice(0, tableSize).map((p) => p.id)),
  );
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleStart() {
    if (selected.size < 2) {
      toast.error("Selecione pelo menos 2 jogadores");
      return;
    }
    startTransition(async () => {
      try {
        await startMatchOnTable({
          physicalTableId,
          playerIds: Array.from(selected),
          randomizeSeats: true,
        });
        toast.success("Partida iniciada");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  if (presentes.length < 2) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Aguardando jogadores na fila
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-11 items-center rounded-md bg-gold px-4 text-sm font-medium text-ink hover:bg-gold/90"
      >
        {cta}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Sugestão: primeiros {tableSize} jogadores da fila. Marque/desmarque conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {presentes.map((p, idx) => (
            <label
              key={p.id}
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-smoke cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-gold"
              />
              <span className="text-paper">{p.name}</span>
              {p.nickname && (
                <span className="font-display text-sm italic text-gold">{p.nickname}</span>
              )}
              <span className="ml-auto font-mono text-[10px] text-gray-mid">#{idx + 1}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <span className="mr-auto font-mono text-xs text-gray-soft">
            {selected.size} selecionados
          </span>
          <Button
            type="button"
            onClick={handleStart}
            disabled={pending}
            className="h-11 bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
          >
            {pending ? "Iniciando…" : cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseTableButton({ physicalTableId }: { physicalTableId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          try {
            await releaseFinishedTable(physicalTableId);
            toast.success("Mesa liberada — pronta pra próxima partida");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro");
          }
        })
      }
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper disabled:opacity-50"
    >
      {pending ? "Liberando…" : "ou deixar mesa livre"}
    </button>
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
