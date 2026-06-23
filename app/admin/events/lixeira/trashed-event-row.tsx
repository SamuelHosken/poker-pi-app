"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { restoreEvent, deleteEventPermanently } from "@/lib/tournament/events";

export function TrashedEventRow({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [pendingRestore, startRestore] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const matches = confirmText.trim().toLowerCase() === "apagar definitivamente";

  function handleRestore() {
    startRestore(async () => {
      try {
        await restoreEvent(eventId);
        toast.success("Evento restaurado");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handlePermanent() {
    if (!matches) return;
    startDelete(async () => {
      try {
        await deleteEventPermanently(eventId);
        toast.success("Apagado definitivamente");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        variant="secondary"
        onClick={handleRestore}
        disabled={pendingRestore || pendingDelete}
        className="flex-1"
      >
        <RotateCcw className="size-4" aria-hidden />
        {pendingRestore ? "Restaurando…" : "Restaurar"}
      </Button>

      <AlertDialog open={open} onOpenChange={(n) => { if (!n) setConfirmText(""); setOpen(n); }}>
        <AlertDialogTrigger className={buttonVariants({ variant: "destructive" }) + " flex-1 sm:flex-initial"}>
          <Trash2 className="size-4" aria-hidden />
          Apagar definitivamente
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar &ldquo;{eventName}&rdquo; pra sempre?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga jogadores, partidas, eliminações, fichas mostradas e
              tudo mais ligado ao evento. <strong>Não dá pra desfazer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Digite <span className="text-destructive">apagar definitivamente</span> pra confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-hair bg-surface px-3 text-sm focus:border-destructive focus:outline-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handlePermanent}
              disabled={!matches || pendingDelete}
            >
              {pendingDelete ? "Apagando…" : "Apagar pra sempre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
