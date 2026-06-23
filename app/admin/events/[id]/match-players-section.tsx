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
import { buttonVariants } from "@/components/ui/button";
import { eliminatePlayer } from "@/lib/tournament/matches";
import type { Tables } from "@/lib/types/database.types";

type Participation = Tables<"participations"> & {
  player: { id: string; name: string; nickname: string | null; state: string };
};

/**
 * V1.1: removeu botão "Finalizar mesa". Mesa não termina mais — admin
 * elimina jogadores até sobrar 1, e detectChampionAndEndEvent (rodando
 * automaticamente após cada eliminação) define o campeão.
 */
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
      className={`flex items-center justify-between gap-2 rounded-xl border border-hair px-3 py-2 text-sm ${
        isEliminated ? "opacity-50" : "bg-surface"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[10px] w-6 text-muted-foreground">
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
      <AlertDialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })}>
        Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {playerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai marcar como ELIMINADO e atribuir posição final. Se for o penúltimo,
            o último restante vira CAMPEAO automaticamente. Pode ser desfeito.
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
