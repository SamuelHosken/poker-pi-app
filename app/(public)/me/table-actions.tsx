"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { joinTableAsPlayer, leaveCurrentTable } from "@/lib/tournament/player-actions";

export function TableActions({
  physicalTableId,
  youAreHere,
  isBusyElsewhere,
  isFinalized,
}: {
  physicalTableId: string;
  youAreHere: boolean;
  isBusyElsewhere: boolean;
  isFinalized: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinTableAsPlayer(physicalTableId);
        toast.success("Você entrou na mesa");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleLeave() {
    startTransition(async () => {
      try {
        await leaveCurrentTable();
        toast.success("Você saiu da mesa");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  if (isFinalized) {
    return (
      <span className="block text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Indisponível
      </span>
    );
  }

  if (youAreHere) {
    return (
      <button
        type="button"
        onClick={handleLeave}
        disabled={pending}
        className="block w-full rounded-md border border-red-poker/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker hover:bg-red-poker/10 disabled:opacity-50"
      >
        {pending ? "Saindo…" : "Você está aqui · Sair"}
      </button>
    );
  }

  if (isBusyElsewhere) {
    return (
      <span className="block text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Saia da mesa atual antes
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={pending}
      className="block w-full rounded-md bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:bg-gold/90 disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}
