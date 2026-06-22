"use client";

import { Skull } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/ui/avatar-image";

type Seat = {
  participationId: string;
  playerId: string;
  name: string;
  nickname?: string | null;
  isYou: boolean;
  avatarUrl?: string | null;
};

type PendingKiller = { id: string | null; name: string | null } | null;

export function EliminateDialog({
  seats,
  open,
  onOpenChange,
  pendingKiller,
  setPendingKiller,
  pendingEliminate,
  onConfirm,
}: {
  seats: Seat[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pendingKiller: PendingKiller;
  setPendingKiller: (k: PendingKiller) => void;
  pendingEliminate: boolean;
  onConfirm: (killerId: string | null) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        // Reseta passo de confirmação quando o diálogo fecha
        if (!o) setPendingKiller(null);
      }}
    >
      <DialogTrigger
        disabled={pendingEliminate}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-poker/40 bg-red-poker/5 text-sm text-red-poker transition-colors hover:bg-red-poker/10 disabled:opacity-40"
      >
        <Skull className="size-4" aria-hidden />
        {pendingEliminate ? "Saindo…" : "Estou eliminado"}
      </DialogTrigger>

      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {pendingKiller === null ? (
          <>
            <DialogHeader className="border-b border-line p-4">
              <DialogTitle>Quem te eliminou?</DialogTitle>
              <DialogDescription>
                Opcional — rastreia rivais no seu perfil. Você confirma na próxima tela.
              </DialogDescription>
            </DialogHeader>

            <ul className="max-h-[50svh] overflow-y-auto p-2">
              {seats
                .filter((s) => !s.isYou)
                .map((s) => (
                  <li key={s.participationId}>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingKiller({ id: s.playerId, name: s.name })
                      }
                      disabled={pendingEliminate}
                      style={{ touchAction: "manipulation" }}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-paper transition-colors hover:bg-smoke active:bg-smoke disabled:opacity-50"
                    >
                      <AvatarImage
                        name={s.name}
                        url={s.avatarUrl}
                        size="sm"
                        variant="outline"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{s.name}</div>
                        {s.nickname && (
                          <div className="truncate font-display text-xs italic text-gold">
                            {s.nickname}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
            </ul>

            <div className="border-t border-line p-3">
              <Button
                variant="secondary"
                onClick={() => setPendingKiller({ id: null, name: null })}
                disabled={pendingEliminate}
                style={{ touchAction: "manipulation" }}
                className="w-full"
              >
                Não dizer · pular
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-line p-4">
              <DialogTitle>Confirmar eliminação?</DialogTitle>
              <DialogDescription>
                {pendingKiller.name
                  ? `Tirado por ${pendingKiller.name}.`
                  : "Sem registrar quem te tirou."}{" "}
                Você sai dessa mesa AGORA e fica eliminado.
              </DialogDescription>
            </DialogHeader>

            {/* Aviso de irreversibilidade — destaque visual */}
            <div className="mx-4 mt-4 rounded-xl border border-red-poker/30 bg-red-poker/8 px-4 py-3 text-sm font-semibold text-red-poker">
              ⚠ Não dá pra voltar sem rebuy. Esta ação é irreversível.
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
              <Button
                variant="secondary"
                onClick={() => setPendingKiller(null)}
                disabled={pendingEliminate}
                style={{ touchAction: "manipulation" }}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm(pendingKiller.id)}
                disabled={pendingEliminate}
                style={{ touchAction: "manipulation" }}
              >
                {pendingEliminate ? "Eliminando…" : "Sim, eliminar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
