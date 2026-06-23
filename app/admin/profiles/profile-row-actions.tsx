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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  setAdminFlag,
  deleteProfile,
  adminUpdatePassword,
} from "@/lib/tournament/profiles";

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
  const [pendingPassword, startPassword] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

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

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    startPassword(async () => {
      try {
        await adminUpdatePassword({ profileId, newPassword });
        toast.success(`Senha de ${name} atualizada`);
        setPasswordOpen(false);
        setNewPassword("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handlePasswordOpen(next: boolean) {
    if (!next) setNewPassword("");
    setPasswordOpen(next);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleToggleAdmin}
        disabled={pendingAdmin}
      >
        {pendingAdmin ? "..." : isAdmin ? "Tirar admin" : "Promover"}
      </Button>

      <Dialog open={passwordOpen} onOpenChange={handlePasswordOpen}>
        <DialogTrigger
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Senha
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha de {name}</DialogTitle>
            <DialogDescription>
              Define uma nova senha pra {name}. Avise a pessoa pessoalmente.
              Mínimo 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              minLength={6}
              autoComplete="new-password"
              autoFocus
              required
              className="h-12 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper focus:border-gold focus:outline-none"
            />
            <DialogFooter>
              <button
                type="submit"
                disabled={pendingPassword || newPassword.length < 6}
                className="h-11 rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold/90 disabled:opacity-50"
              >
                {pendingPassword ? "Salvando…" : "Salvar senha"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger
          className={buttonVariants({ variant: "destructive", size: "sm" })}
        >
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
