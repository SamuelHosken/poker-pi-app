"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteEvent } from "@/lib/tournament/events";

export function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmsMatch = confirmText.trim().toLowerCase() === "apagar";

  function handleDelete() {
    if (!confirmsMatch) return;
    startTransition(async () => {
      try {
        await deleteEvent(eventId);
        toast.success("Evento movido pra lixeira");
        router.push("/admin/events");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmText("");
    setOpen(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger className={`${buttonVariants({ variant: "destructive" })} gap-2`}>
        <Trash2 className="size-4" aria-hidden />
        Mover pra lixeira
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mover &ldquo;{eventName}&rdquo; pra lixeira?</AlertDialogTitle>
          <AlertDialogDescription>
            Evento some da lista principal mas <strong>nada é apagado</strong>.
            Você pode restaurar a qualquer momento em <strong>/admin/events/lixeira</strong>.
            Pra apagar definitivamente, faça isso pela lixeira depois.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
            Digite <span className="text-red-poker">apagar</span> pra confirmar
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
            onClick={handleDelete}
            disabled={!confirmsMatch || pending}
            className="bg-red-poker text-white hover:bg-red-poker/90 disabled:opacity-40"
          >
            {pending ? "Movendo…" : "Mover pra lixeira"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
