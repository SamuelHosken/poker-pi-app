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
import { setAdminFlag, deleteProfile } from "@/lib/tournament/profiles";

export function ProfileRowActions({
  profileId,
  name,
  isAdmin,
}: {
  profileId: string;
  name: string;
  isAdmin: boolean;
}) {
  const [pendingAdmin, startAdmin] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleToggleAdmin() {
    startAdmin(async () => {
      try {
        await setAdminFlag(profileId, !isAdmin);
        toast.success(
          !isAdmin ? `${name} agora é admin` : `${name} agora é jogador`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteProfile(profileId);
        toast.success(`${name} removido`);
        setDeleteOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={handleToggleAdmin}
        disabled={pendingAdmin}
        className="rounded-md border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:border-gold/50 hover:text-gold disabled:opacity-50"
      >
        {pendingAdmin ? "..." : isAdmin ? "Tirar admin" : "Promover admin"}
      </button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger className="rounded-md border border-red-poker/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker hover:bg-red-poker/10">
          Apagar
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai remover o perfil <strong>e</strong> o login. Eventos em que
              {" "}{name} participou continuam visíveis no histórico, mas
              {name} não vai conseguir entrar mais.
              <br />
              <br />
              Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pendingDelete}
              className="bg-red-poker text-white hover:bg-red-poker/90"
            >
              {pendingDelete ? "Apagando…" : "Apagar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
