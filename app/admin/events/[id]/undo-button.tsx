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
import { undoLastAction } from "@/lib/tournament/matches";

const ACTION_LABEL: Record<string, string> = {
  ELIMINATE_PLAYER: "última eliminação",
  FINISH_MATCH: "finalização da mesa",
  START_MATCH: "início da partida",
  ASSIGN_SEAT: "atribuição de cadeira",
  REBUY_PLAYER: "rebuy",
  TRANSITION_TO_FINAL: "transição pra mesa final",
};

export function UndoButton({ eventId, enabled }: { eventId: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await undoLastAction(eventId);
        if (res.undone) {
          toast.success(`Desfeito: ${ACTION_LABEL[res.undone] ?? res.undone}`);
        } else {
          toast.info("Nada pra desfazer.");
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={!enabled || pending}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground`}
      >
        ↶ Desfazer última ação
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer a última ação?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai reverter o estado da última operação reversível registrada no log.
            Útil quando algo foi marcado por engano.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-gold text-ink hover:bg-gold/90"
          >
            {pending ? "Desfazendo…" : "Desfazer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
