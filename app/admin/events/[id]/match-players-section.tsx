"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { eliminatePlayer, finishMatch } from "@/lib/tournament/matches";
import type { Tables } from "@/lib/types/database.types";

type Participation = Tables<"participations"> & {
  player: { id: string; name: string; nickname: string | null; state: string };
};

export function MatchPlayersSection({
  matchId,
  participations,
}: {
  matchId: string;
  participations: Participation[];
}) {
  const remaining = participations.filter((p) => !p.eliminated_at);
  const eliminated = participations.filter((p) => p.eliminated_at);

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          Na mesa · {remaining.length} restante{remaining.length === 1 ? "" : "s"}
        </span>
        {remaining.length === 1 && remaining[0] && (
          <FinishMatchButton matchId={matchId} winnerName={remaining[0].player.name} />
        )}
      </div>

      <ul className="space-y-1.5">
        {participations.map((p) => (
          <PlayerRow key={p.id} matchId={matchId} participation={p} />
        ))}
      </ul>

      {eliminated.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
          {eliminated.length} eliminado{eliminated.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function PlayerRow({
  matchId,
  participation,
}: {
  matchId: string;
  participation: Participation;
}) {
  const isEliminated = !!participation.eliminated_at;

  return (
    <li
      className={`flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm ${
        isEliminated ? "opacity-50" : "bg-ink-2"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[10px] w-6 text-gray-mid">
          {participation.seat_number != null ? `#${participation.seat_number}` : ""}
        </span>
        <span className="truncate text-paper">{participation.player.name}</span>
        {participation.player.nickname && (
          <span className="truncate font-display text-xs italic text-gold">
            {participation.player.nickname}
          </span>
        )}
      </div>
      {isEliminated ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          Eliminado · {participation.final_position}º
        </span>
      ) : (
        <EliminateButton
          matchId={matchId}
          playerId={participation.player.id}
          playerName={participation.player.name}
        />
      )}
    </li>
  );
}

function EliminateButton({
  matchId,
  playerId,
  playerName,
}: {
  matchId: string;
  playerId: string;
  playerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await eliminatePlayer({ matchId, playerId });
        toast.success(`${playerName} eliminado · posição ${res.finalPosition}º`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="rounded-md border border-red-poker/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker hover:bg-red-poker/10"
      >
        Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {playerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai marcar como ELIMINADO e atribuir posição final na partida. Pode ser desfeito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-red-poker text-white hover:bg-red-poker/90"
          >
            {pending ? "Eliminando…" : "Confirmar eliminação"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FinishMatchButton({
  matchId,
  winnerName,
}: {
  matchId: string;
  winnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await finishMatch(matchId);
        toast.success(`Mesa finalizada · ${winnerName} classificado`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="rounded-md bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:bg-gold/90"
      >
        Finalizar mesa
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar a mesa?</AlertDialogTitle>
          <AlertDialogDescription>
            {winnerName} será marcado como CLASSIFICADO (vai pra mesa final).
            A mesa física fica FINALIZADA. Pode ser desfeito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-gold text-ink hover:bg-gold/90"
          >
            {pending ? "Finalizando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

