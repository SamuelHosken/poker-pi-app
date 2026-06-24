"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
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
import { resetBlindsFromTemplate } from "@/lib/tournament/events";

/**
 * V1.3 — Botão "Resetar blinds Casa" pro admin reaplicar o template padrão
 * (20 níveis Casa) em um evento existente que ficou com blinds antigos ou
 * customizados. Apaga todas as blind_levels do evento e recria.
 */
export function ResetBlindsButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await resetBlindsFromTemplate({ eventId, templateKey: "padrao" });
        toast.success("Blinds resetados pro template Casa (20 níveis)");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={pending}
        className={buttonVariants({ variant: "destructive", size: "default" }) + " w-full font-mono text-[10px] uppercase tracking-[0.18em]"}
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {pending ? "Resetando…" : "Resetar blinds pro template Casa"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar blinds desse evento?</AlertDialogTitle>
          <AlertDialogDescription>
            Apaga toda a estrutura de blinds atual (de todas as mesas) e recria
            do zero com o template Casa: 20 níveis, 1ª etapa rebuy (25min),
            depois 20min, depois 15min. Nível das mesas em andamento volta pro
            nível 1. Edições manuais nos blinds vão ser perdidas. Sem undo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handle}
            disabled={pending}
            variant="destructive"
          >
            {pending ? "Resetando…" : "Resetar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
