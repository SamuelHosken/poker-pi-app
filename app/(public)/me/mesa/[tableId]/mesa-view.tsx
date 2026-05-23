"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Coins, Skull } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import {
  eliminateSelf,
  switchToTable,
  type TableView,
} from "@/lib/tournament/player-actions";
import { PokerTable } from "@/components/tv/poker-table";
import { useReactions } from "@/lib/realtime/use-reactions";
import { useAvatarRefresh } from "@/lib/realtime/avatar-broadcast";
import { ReactionBar } from "./reaction-bar";

type Participation = {
  id: string;
  player_id: string;
  seat_number: number | null;
  match_id: string;
  eliminated_at: string | null;
};

/**
 * V1.3 — Visualização da mesa pro player: mesa oval no centro, avatares ao redor.
 * Realtime: re-fetch via router.refresh quando alguém entra/sai (mais simples
 * que reconciliar payload, e o seat_number precisa ser estável).
 */
export function MesaView({ initial }: { initial: TableView }) {
  const router = useRouter();
  const [pendingEliminate, startEliminate] = useTransition();
  const [pendingSwitch, startSwitch] = useTransition();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [eliminateOpen, setEliminateOpen] = useState(false);
  // V1.3: passo 2 do diálogo — depois de escolher quem te eliminou (ou "não
  // dizer"), mostra confirmação antes de chamar a action. Tap acidental
  // não te tira da mesa.
  const [pendingKiller, setPendingKiller] = useState<
    { id: string | null; name: string | null } | null
  >(null);
  const [seats] = useState(initial.seats);
  const matchId = initial.match?.id;

  // Realtime: mudanças em participations → router.refresh debounced (300ms).
  // Várias entradas/saídas em sequência coalescem em 1 server re-render só.
  useEffect(() => {
    if (!matchId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`mesa-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participations",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Participation | null;
          if (!row) return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 300);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [matchId, router]);

  function handleEliminate(killerId: string | null) {
    setEliminateOpen(false);
    setPendingKiller(null);
    // Optimistic: navega pra /me imediatamente. Toast aparece depois (sonner
    // persiste entre rotas). Em caso de erro, volta pra mesa.
    router.push("/me");
    startEliminate(async () => {
      try {
        const res = await eliminateSelf({
          eventId: initial.eventId,
          eliminatedByPlayerId: killerId,
        });
        toast.success(`Você ficou em ${res.finalPosition}º`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
        router.push(`/me/mesa/${initial.table.id}`);
      }
    });
  }

  function handleSwitch(targetTableId: string) {
    setSwitchOpen(false);
    // Optimistic: navega pra mesa nova já. Se a troca falhar, volta pra atual.
    router.push(`/me/mesa/${targetTableId}`);
    startSwitch(async () => {
      try {
        await switchToTable(targetTableId, initial.eventId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao trocar");
        router.push(`/me/mesa/${initial.table.id}`);
      }
    });
  }

  const count = seats.length;
  const otherTables = initial.otherTables.filter((t) => t.state !== "FINALIZADA");

  // Reações em tempo real (broadcast por evento)
  const { reactions, sendReaction } = useReactions(initial.eventId);
  // Re-fetch quando outra pessoa troca a foto de perfil
  useAvatarRefresh();
  const mySeat = seats.find((s) => s.isYou);
  function handleReact(emoji: string) {
    if (!mySeat) return;
    sendReaction(mySeat.playerId, emoji);
  }

  // Pré-aquece RSC payload das mesas alternativas — quando o dialog abrir
  // e o usuário tocar numa, a navegação já tem cache.
  useEffect(() => {
    for (const t of otherTables) {
      router.prefetch(`/me/mesa/${t.id}`);
    }
    router.prefetch("/me");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, otherTables.map((t) => t.id).join(",")]);

  return (
    <div className="mt-6 flex flex-1 flex-col items-center gap-6 sm:mt-8">
      {/* Mesa + avatares */}
      <div className="mx-auto w-full max-w-sm">
        <PokerTable
          seats={seats.map((s) => ({
            id: s.participationId,
            playerId: s.playerId,
            name: s.name,
            nickname: s.nickname,
            seatNumber: s.seatNumber,
            isHighlighted: s.isYou,
            avatarUrl: s.avatarUrl,
            eliminationCount: s.eliminationCount,
          }))}
          avatarSize="md"
          reactions={reactions}
          centerSlot={
            <>
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold/70">
                Mesa
              </span>
              <span className="font-display text-5xl font-light leading-none text-paper sm:text-6xl">
                {initial.table.table_number}
              </span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
                {seats.length} {seats.length === 1 ? "pessoa" : "pessoas"}
              </span>
            </>
          }
        />
      </div>

      {/* Reações rápidas — emoji flutua do avatar do player na mesa */}
      {mySeat && <ReactionBar onReact={handleReact} />}

      {/* Meu dinheiro — destaque pro player se exibir */}
      <Link
        href={`/me/mesa/${initial.table.id}/dinheiro`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold text-sm font-medium text-ink transition-colors hover:bg-gold/90"
      >
        <Coins className="size-4" aria-hidden />
        Meu dinheiro
      </Link>

      {/* Lista textual (acessível, mobile-friendly) */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            Na mesa · {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-ink-2 px-4 py-6 text-center font-mono text-xs text-gray-soft">
            Mesa vazia. Você é o primeiro!
          </p>
        ) : (
          <ul className="space-y-1.5">
            {seats.map((s) => (
              <li
                key={s.participationId}
                className={`flex items-center gap-3 rounded-md border p-2.5 ${
                  s.isYou ? "border-gold/60 bg-gold/5" : "border-line bg-ink-2"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-light ${
                    s.isYou
                      ? "bg-gold text-ink"
                      : "border border-line bg-ink text-gold"
                  }`}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-paper">
                    {s.name}
                    {s.isYou && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                        Você
                      </span>
                    )}
                  </div>
                  {s.nickname && (
                    <div className="truncate font-display text-xs italic text-gold">
                      {s.nickname}
                    </div>
                  )}
                </div>
                {s.seatNumber != null && (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    #{s.seatNumber}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ações: trocar de mesa + sair eliminado */}
      <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
          <DialogTrigger
            disabled={otherTables.length === 0 || pendingSwitch}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRightLeft className="size-4" aria-hidden />
            {pendingSwitch ? "Trocando…" : "Trocar de mesa"}
          </DialogTrigger>
          <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-line p-4">
              <DialogTitle>Trocar de mesa</DialogTitle>
              <DialogDescription>
                Você sai daqui e entra na mesa escolhida. Não conta como eliminação.
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-[60svh] overflow-y-auto p-2">
              {otherTables.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(t.id)}
                    disabled={pendingSwitch}
                    className="flex w-full items-center gap-3 rounded-md p-3 text-left text-paper transition-colors hover:bg-smoke disabled:opacity-50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-ink-2 font-display text-lg text-gold">
                      {t.tableNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">Mesa {t.tableNumber}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                        {t.state} · {t.seats} {t.seats === 1 ? "pessoa" : "pessoas"}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>

        <Dialog
          open={eliminateOpen}
          onOpenChange={(o) => {
            setEliminateOpen(o);
            // Reseta passo de confirmação quando o diálogo fecha
            if (!o) setPendingKiller(null);
          }}
        >
          <DialogTrigger
            disabled={pendingEliminate}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-red-poker/40 bg-red-poker/5 text-sm text-red-poker transition-colors hover:bg-red-poker/10 disabled:opacity-40"
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
                    Opcional — rastreia rivais no seu perfil. Você confirma na
                    próxima tela.
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
                          className="flex w-full items-center gap-3 rounded-md p-3 text-left text-paper transition-colors hover:bg-smoke active:bg-smoke disabled:opacity-50"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-ink-2 font-display text-base font-light text-gold">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
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
                  <button
                    type="button"
                    onClick={() => setPendingKiller({ id: null, name: null })}
                    disabled={pendingEliminate}
                    style={{ touchAction: "manipulation" }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-ink-2 text-sm text-gray-soft transition-colors hover:border-red-poker/40 hover:text-red-poker disabled:opacity-40"
                  >
                    Não dizer · pular
                  </button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="border-b border-line p-4">
                  <DialogTitle>Confirmar eliminação?</DialogTitle>
                  <DialogDescription>
                    Você sai dessa mesa AGORA e fica em{" "}
                    <span className="text-paper">ELIMINADO</span>. Não dá pra
                    voltar sem rebuy. {pendingKiller.name
                      ? `Tirado por ${pendingKiller.name}.`
                      : "Sem registrar quem te tirou."}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setPendingKiller(null)}
                    disabled={pendingEliminate}
                    style={{ touchAction: "manipulation" }}
                    className="flex h-12 items-center justify-center rounded-md border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 disabled:opacity-40"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminate(pendingKiller.id)}
                    disabled={pendingEliminate}
                    style={{ touchAction: "manipulation" }}
                    className="flex h-12 items-center justify-center rounded-md bg-red-poker text-sm font-medium text-white transition-colors hover:bg-red-poker/90 disabled:opacity-40"
                  >
                    {pendingEliminate ? "Eliminando…" : "Sim, eliminar"}
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

