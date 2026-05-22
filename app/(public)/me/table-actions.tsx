"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { joinTableAsPlayer } from "@/lib/tournament/player-actions";

export function TableActions({
  physicalTableId,
  youAreHere,
  isBusyElsewhere,
  isFinalized,
  hasPaid,
  playerState,
}: {
  physicalTableId: string;
  youAreHere: boolean;
  isBusyElsewhere: boolean;
  isFinalized: boolean;
  hasPaid: boolean;
  playerState: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Pre-warm o RSC payload do destino — só vale se vai conseguir entrar
  useEffect(() => {
    if (!isFinalized && !isBusyElsewhere && hasPaid && !youAreHere) {
      router.prefetch(`/me/mesa/${physicalTableId}`);
    }
  }, [router, physicalTableId, isFinalized, isBusyElsewhere, hasPaid, youAreHere]);

  function handleJoin() {
    // Optimistic: navega ANTES do action terminar.
    router.push(`/me/mesa/${physicalTableId}`);
    startTransition(async () => {
      try {
        await joinTableAsPlayer(physicalTableId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao entrar");
        router.push("/me");
      }
    });
  }

  if (isFinalized) {
    return (
      <span className="block py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Indisponível
      </span>
    );
  }

  if (youAreHere) {
    return (
      <Link
        href={`/me/mesa/${physicalTableId}`}
        prefetch
        style={{ touchAction: "manipulation" }}
        className="flex h-11 w-full items-center justify-center rounded-md border border-gold/60 bg-gold/10 px-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/20 active:bg-gold/20"
      >
        Você está aqui · Abrir mesa
      </Link>
    );
  }

  // V1.3 — bloqueia entrada se admin não marcou pago.
  // Eliminado sem rebuy → mensagem específica.
  if (!hasPaid) {
    const isEliminated = playerState === "ELIMINADO";
    return (
      <div
        className="flex h-auto min-h-11 w-full items-center gap-2 rounded-md border border-red-poker/40 bg-red-poker/10 px-3 py-2"
        role="alert"
      >
        <Wallet className="size-4 shrink-0 text-red-poker" aria-hidden />
        <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.18em] text-red-poker">
          {isEliminated
            ? "Pague o rebuy com o admin pra voltar"
            : "Pague o buy-in com o admin pra entrar"}
        </span>
      </div>
    );
  }

  if (isBusyElsewhere) {
    return (
      <span className="block py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Saia da mesa atual antes
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      style={{ touchAction: "manipulation" }}
      className="flex h-11 w-full items-center justify-center rounded-md bg-gold px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:bg-gold/90 active:scale-[0.98]"
    >
      Entrar
    </button>
  );
}
