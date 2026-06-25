"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { crownChampion } from "@/lib/tournament/events";
import type { Tables } from "@/lib/types/database.types";

type Player = Tables<"players">;

export function CrownChampionControl({
  eventId,
  players,
  currentChampionId,
}: {
  eventId: string;
  players: Player[];
  currentChampionId: string | null;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Player | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!confirm) return;
    startTransition(async () => {
      try {
        await crownChampion({ eventId, playerId: confirm.id });
        toast.success(`${confirm.name} é o campeão`);
        setConfirm(null);
        setPickerOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  // Lista ordenada: ativos primeiro, depois eliminados
  const sorted = [...players].sort((a, b) => {
    const ax = a.state === "ELIMINADO" ? 1 : 0;
    const bx = b.state === "ELIMINADO" ? 1 : 0;
    if (ax !== bx) return ax - bx;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogTrigger className={`${buttonVariants({ size: "lg" })} gap-2`}>
          <Crown className="size-4" aria-hidden />
          {currentChampionId ? "Trocar campeão" : "Definir campeão"}
        </DialogTrigger>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-line p-4">
            <DialogTitle>Quem foi o campeão?</DialogTitle>
            <DialogDescription>
              Escolhe quem ganhou. O evento é encerrado e a pessoa entra na galeria.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[60svh] overflow-y-auto p-2">
            {sorted.map((p) => {
              const isCurrent = p.id === currentChampionId;
              const isEliminated = p.state === "ELIMINADO";
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setConfirm(p)}
                    disabled={pending || isCurrent}
                    className={`flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors ${
                      isCurrent
                        ? "border border-gold/40 bg-gold/10 text-gold"
                        : "text-paper hover:bg-smoke disabled:opacity-50"
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-base font-light ${
                        isCurrent
                          ? "bg-gold text-ink"
                          : "border border-line bg-ink text-gold"
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{p.name}</div>
                      {p.nickname && (
                        <div className="truncate font-display text-xs italic text-gold">
                          {p.nickname}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
                      {isCurrent ? "atual" : isEliminated ? "eliminado" : p.state.toLowerCase()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Coroar {confirm?.name} como campeão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marca <strong>{confirm?.name}</strong> como CAMPEÃO com posição 1
              e encerra o evento. Aparece na galeria histórica.
              {currentChampionId && currentChampionId !== confirm?.id && (
                <>
                  <br />
                  <br />
                  Substitui o campeão atual (anterior vira 2º).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending}
              className="bg-gold text-ink hover:bg-gold/90"
            >
              {pending ? "Coroando…" : "Coroar campeão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
