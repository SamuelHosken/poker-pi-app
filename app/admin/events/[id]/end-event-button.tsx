"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { endEventManually } from "@/lib/tournament/events";

/**
 * V1.3 — Encerra o evento SEM campeão. Pra coroar alguém, usa
 * o botão "Definir campeão" acima (que já fecha o evento junto).
 *
 * Este botão serve pra cancelar/abortar: galera foi embora, hardware
 * pifou, etc. Posição discreta no rodapé.
 */
export function EndEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await endEventManually(eventId);
        toast.success("Evento encerrado sem campeão");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid hover:text-red-poker">
        Encerrar sem campeão
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar o evento sem coroar?</AlertDialogTitle>
          <AlertDialogDescription>
            Se quiser coroar um campeão, fecha esta janela e usa o botão{" "}
            <strong>Definir campeão</strong>. Aquele encerra o evento e marca o
            vencedor numa ação só.
            <br />
            <br />
            Este botão encerra o evento <strong>sem campeão</strong> — pra
            quando deu errado e galera foi embora.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-red-poker text-white hover:bg-red-poker/90"
          >
            {pending ? "Encerrando…" : "Encerrar agora"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
