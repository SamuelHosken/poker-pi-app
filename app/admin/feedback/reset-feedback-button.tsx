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
import { resetAllFeedback } from "@/lib/tournament/feedback";

export function ResetFeedbackButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmsMatch = confirmText.trim().toLowerCase() === "apagar";

  function handleReset() {
    if (!confirmsMatch) return;
    startTransition(async () => {
      try {
        const { deleted } = await resetAllFeedback();
        toast.success(
          `${deleted} avaliação${deleted === 1 ? "" : "ões"} apagada${
            deleted === 1 ? "" : "s"
          }`,
        );
        setOpen(false);
        setConfirmText("");
        router.refresh();
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
        Resetar avaliações
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar todas as avaliações?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso remove <strong>todas as {count} respostas</strong> de forma{" "}
            <strong>permanente</strong>. Não dá pra desfazer. Use quando quiser
            zerar pra começar a coletar de novo.
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
            onClick={handleReset}
            disabled={!confirmsMatch || pending}
            className="bg-red-poker text-white hover:bg-red-poker/90 disabled:opacity-40"
          >
            {pending ? "Apagando…" : "Apagar tudo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
