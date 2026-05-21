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
import { transitionToFinalTable } from "@/lib/tournament/final-table";

export function TransitionToFinalButton({
  eventId,
  classifiedCount,
  enabled,
  reason,
}: {
  eventId: string;
  classifiedCount: number;
  enabled: boolean;
  reason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await transitionToFinalTable(eventId);
        toast.success("Mesa Final montada — clique pra iniciar quando todos sentarem");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={!enabled}
        title={enabled ? undefined : reason}
        className="inline-flex h-12 items-center rounded-md bg-gold px-5 font-medium text-ink hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enabled
          ? `Ir para Mesa Final (${classifiedCount} classificados)`
          : `Mesa Final indisponível`}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Montar Mesa Final?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai criar uma nova partida na Mesa 1 reunindo os {classifiedCount}{" "}
            classificados (cadeiras sorteadas). Os jogadores que estavam em CLASSIFICADO
            viram NA_FINAL. As outras mesas físicas ficam descomissionadas.
            <br />
            <br />
            Depois disso você clica em &quot;Iniciar Mesa Final&quot; pra começar a contar tempo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-gold text-ink hover:bg-gold/90"
          >
            {pending ? "Montando…" : "Montar Mesa Final"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
