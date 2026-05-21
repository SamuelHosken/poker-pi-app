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
 * V1.1 — Fallback pra encerrar o evento manualmente.
 * Detecção automática (detectChampionAndEndEvent) cobre o caso normal de
 * "sobrou 1 jogador". Este botão é pra quando algo deu errado (todos
 * foram embora, deu pau de hardware, etc).
 *
 * Posição: rodapé, não muito proeminente.
 */
export function EndEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await endEventManually(eventId);
        toast.success(
          res.crownedChampionId
            ? "Evento encerrado · campeão coroado"
            : "Evento encerrado sem campeão definido",
        );
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
        Encerrar evento manualmente
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar o evento agora?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma ação de fallback. Normalmente o evento encerra sozinho
            quando sobra apenas 1 jogador ativo.
            <br />
            <br />
            Se houver exatamente 1 jogador em JOGANDO, ele vira <strong>CAMPEAO</strong>.
            Caso contrário, evento encerra sem campeão definido.
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
