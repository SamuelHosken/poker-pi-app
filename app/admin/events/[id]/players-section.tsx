"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRightLeft, Check, ChevronDown, UserPlus, Trash2, Wallet, WalletMinimal } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPlayer, removePlayerFromEvent, markPlayerPaid } from "@/lib/tournament/players";
import { adminMovePlayer } from "@/lib/tournament/matches";
import { broadcastPlayerUpdate } from "@/lib/realtime/avatar-broadcast";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarImage } from "@/components/ui/avatar-image";
import { playerStateLabel, tableStateLabel } from "@/lib/ui-labels";
import type { PlayerState, MatchState } from "@/lib/types/domain";

type Player = Tables<"players">;
type Profile = Tables<"profiles">;
type PhysicalTable = Tables<"physical_tables">;

/**
 * V1.2 — Credenciamento usa profiles cadastrados (não input livre de nome).
 * Admin escolhe da lista de profiles que ainda não estão neste evento.
 * Pra cadastrar pessoa nova, vai pra /admin/profiles/new.
 */
export function PlayersSection({
  eventId,
  players,
  availableProfiles,
  physicalTables = [],
}: {
  eventId: string;
  players: Player[];
  availableProfiles: Profile[];
  physicalTables?: PhysicalTable[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const selectedProfile = availableProfiles.find((p) => p.id === selectedProfileId);

  function handleAdd() {
    if (!selectedProfileId) {
      toast.error("Selecione um perfil");
      return;
    }
    const profile = availableProfiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      toast.error("Perfil não encontrado");
      return;
    }
    startTransition(async () => {
      try {
        await createPlayer({
          eventId,
          name: profile.name,
          nickname: profile.nickname ?? null,
          profileId: profile.id,
        });
        toast.success(`${profile.name} adicionado`);
        setSelectedProfileId("");
        // /me do jogador atualiza sem esperar LiveRefresh
        broadcastPlayerUpdate().catch(() => {});
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  const presentes = players.filter((p) => p.state === "PRESENTE");

  return (
    <section className="space-y-4">
      {/* Header com hierarquia clara */}
      <div className="space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Credenciamento
        </span>
        <h2 className="font-display text-2xl font-light leading-tight text-paper sm:text-3xl">
          {presentes.length}{" "}
          <span className="text-gray-soft">
            {presentes.length === 1 ? "pessoa presente" : "pessoas presentes"}
          </span>
        </h2>
      </div>

      {/* Card de ação: adicionar pessoa */}
      <Card>
        <CardContent className="space-y-4 py-5">
          {availableProfiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Todas as pessoas já estão neste evento
              </span>
              <Link
                href="/admin/profiles/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-hair bg-surface px-4 text-sm text-paper transition-colors hover:bg-surface-2"
              >
                <UserPlus className="size-4" aria-hidden />
                Cadastrar nova pessoa
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Adicionar pessoa ao evento
                </span>

                <ProfilePicker
                  profiles={availableProfiles}
                  value={selectedProfileId}
                  onChange={setSelectedProfileId}
                  disabled={pending}
                  selectedLabel={
                    selectedProfile
                      ? selectedProfile.nickname
                        ? `${selectedProfile.name} — ${selectedProfile.nickname}`
                        : selectedProfile.name
                      : null
                  }
                />
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleAdd}
                disabled={pending || !selectedProfileId}
                className="w-full"
              >
                {pending ? "Adicionando…" : "+ Adicionar"}
              </Button>

              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-hair" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  ou
                </span>
                <span className="h-px flex-1 bg-hair" aria-hidden />
              </div>

              <Link
                href="/admin/profiles/new"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-hair bg-surface text-sm text-paper transition-colors hover:bg-surface-2"
              >
                <UserPlus className="size-4" aria-hidden />
                Cadastrar nova pessoa
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista de pessoas no evento */}
      {players.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
            No evento · {players.length}
          </span>
          <ul className="space-y-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-hair bg-surface p-3 sm:p-3.5"
              >
                <AvatarImage name={p.name} size="sm" variant="inline" />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-paper">{p.name}</div>
                  <div className="flex items-center gap-2 truncate">
                    {p.nickname && (
                      <span className="truncate font-display text-xs italic text-gold">
                        {p.nickname}
                      </span>
                    )}
                    {!p.profile_id && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        convidado
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {playerStateLabel(p.state as PlayerState)}
                </span>

                <PaidToggle
                  playerId={p.id}
                  playerName={p.name}
                  isPaid={p.has_paid_buyin}
                  playerState={p.state}
                />

                {physicalTables.length > 0 && p.has_paid_buyin && (
                  <MovePlayerButton
                    playerId={p.id}
                    playerName={p.name}
                    physicalTables={physicalTables}
                  />
                )}

                {(p.state === "INSCRITO" || p.state === "PRESENTE") && (
                  <RemovePlayerButton playerId={p.id} playerName={p.name} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Picker customizado de profile: botão estilizado abre Dialog com lista
 * (substitui o <select> nativo que renderizava com cores do OS).
 */
function ProfilePicker({
  profiles,
  value,
  onChange,
  disabled,
  selectedLabel,
}: {
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  selectedLabel: string | null;
}) {
  const [open, setOpen] = useState(false);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        className="flex h-12 w-full items-center justify-between rounded-md border border-line bg-ink px-4 text-left text-sm transition-colors hover:border-gold/40 focus:border-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedLabel ? "truncate text-paper" : "truncate text-gray-mid"}>
          {selectedLabel ?? "Selecione uma pessoa…"}
        </span>
        <ChevronDown className="ml-2 size-4 shrink-0 text-gray-soft" aria-hidden />
      </DialogTrigger>
      <DialogContent className="max-h-[80svh] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b border-line p-4">
          <DialogTitle className="font-display text-xl font-light text-paper">
            Selecionar pessoa
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
            {profiles.length} {profiles.length === 1 ? "perfil disponível" : "perfis disponíveis"}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[60svh] overflow-y-auto p-2">
          {profiles.map((p) => {
            const isSelected = p.id === value;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors ${
                    isSelected
                      ? "bg-gold/10 text-paper"
                      : "text-paper hover:bg-smoke"
                  }`}
                >
                  <AvatarImage name={p.name} size="sm" variant="inline" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{p.name}</div>
                    {p.nickname && (
                      <div className="truncate font-display text-xs italic text-gold">
                        {p.nickname}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="size-5 shrink-0 text-gold" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function PaidToggle({
  playerId,
  playerName,
  isPaid,
  playerState,
}: {
  playerId: string;
  playerName: string;
  isPaid: boolean;
  playerState: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await markPlayerPaid({ playerId, paid: !isPaid });
        toast.success(
          !isPaid
            ? `${playerName} marcado como pago`
            : `${playerName} desmarcado`,
        );
        // Avisa /me do jogador na hora — sem esperar o LiveRefresh de 5s
        broadcastPlayerUpdate().catch(() => {});
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  // Pra ELIMINADO mostra label "Rebuy" pra ser mais claro o significado
  const isEliminated = playerState === "ELIMINADO";
  const label = isEliminated && !isPaid ? "Rebuy" : isPaid ? "Pago" : "Marcar";

  return (
    <Button
      type="button"
      variant={isPaid ? "secondary" : "destructive"}
      size="sm"
      onClick={handle}
      disabled={pending}
      aria-label={isPaid ? `Desmarcar pagamento de ${playerName}` : `Marcar ${playerName} como pago`}
      style={{ touchAction: "manipulation" }}
      className="shrink-0 gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
    >
      {isPaid ? (
        <Wallet className="size-3.5" aria-hidden />
      ) : (
        <WalletMinimal className="size-3.5" aria-hidden />
      )}
      {label}
    </Button>
  );
}

function MovePlayerButton({
  playerId,
  playerName,
  physicalTables,
}: {
  playerId: string;
  playerName: string;
  physicalTables: PhysicalTable[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handle(tableId: string) {
    startTransition(async () => {
      try {
        await adminMovePlayer({ playerId, targetTableId: tableId });
        toast.success(`${playerName} movido`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  const available = physicalTables.filter((t) => t.state !== "FINALIZADA");
  if (available.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`Mover ${playerName} de mesa`}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-hair text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
      >
        <ArrowRightLeft className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-line p-4">
          <DialogTitle>Mover {playerName}</DialogTitle>
          <DialogDescription>
            Coloca em outra mesa. Se a mesa destino tá LIVRE, vira JOGANDO
            quando ele entra.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50svh] overflow-y-auto p-2">
          {available.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => handle(t.id)}
                disabled={pending}
                className="flex w-full items-center gap-3 rounded-md p-3 text-left text-paper transition-colors hover:bg-smoke disabled:opacity-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-ink-2 font-display text-lg text-gold">
                  {t.table_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">Mesa {t.table_number}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {tableStateLabel(t.state as MatchState)}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function RemovePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await removePlayerFromEvent(playerId);
        toast.success(`${playerName} removido`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        aria-label={`Remover ${playerName}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-hair text-muted-foreground transition-colors hover:border-red-poker/40 hover:text-red-poker"
      >
        <Trash2 className="size-4" aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {playerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai tirar {playerName} deste evento. Útil pra apagar convidado
            antigo (cadastrado antes de existirem perfis) ou alguém adicionado
            por engano.
            <br />
            <br />
            Só funciona enquanto a pessoa ainda não jogou.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-red-poker text-white hover:bg-red-poker/90"
          >
            {pending ? "Removendo…" : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
