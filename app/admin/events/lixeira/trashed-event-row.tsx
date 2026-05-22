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
      <button
        type="button"
        onClick={handleRestore}
        disabled={pendingRestore || pendingDelete}
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/5 px-4 text-sm text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
      >
        <RotateCcw className="size-4" aria-hidden />
        {pendingRestore ? "Restaurando…" : "Restaurar"}
      </button>

      <AlertDialog open={open} onOpenChange={(n) => { if (!n) setConfirmText(""); setOpen(n); }}>
        <AlertDialogTrigger className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-red-poker/40 px-4 text-sm text-red-poker transition-colors hover:bg-red-poker/10 sm:flex-initial">
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
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
              Digite <span className="text-red-poker">apagar definitivamente</span> pra confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper focus:border-red-poker focus:outline-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanent}
              disabled={!matches || pendingDelete}
              className="bg-red-poker text-white hover:bg-red-poker/90 disabled:opacity-40"
            >
              {pendingDelete ? "Apagando…" : "Apagar pra sempre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
