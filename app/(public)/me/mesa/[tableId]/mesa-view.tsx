"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins } from "lucide-react";
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
import { MesaPlayersList } from "./mesa-players-list";
import { EliminateDialog } from "./eliminate-dialog";
import { SwitchTableDialog } from "./switch-table-dialog";

type Participation = { id: string; player_id: string; seat_number: number | null; match_id: string; eliminated_at: string | null };

/** V1.3 — Mesa oval + avatares. Realtime via router.refresh (debounced 300ms). */
export function MesaView({ initial }: { initial: TableView }) {
  const router = useRouter();
  const [pendingEliminate, startEliminate] = useTransition();
  const [pendingSwitch, startSwitch] = useTransition();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [eliminateOpen, setEliminateOpen] = useState(false);
  // Passo 2 do dialog: confirma quem eliminou antes de chamar a action.
  const [pendingKiller, setPendingKiller] = useState<{ id: string | null; name: string | null } | null>(null);
  // Usa initial.seats direto (prop) — não congelar com useState.
  const seats = initial.seats;
  const matchId = initial.match?.id;

  // Realtime: participations → router.refresh debounced.
  useEffect(() => {
    if (!matchId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`mesa-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participations", filter: `match_id=eq.${matchId}` }, (payload) => {
        const row = (payload.new ?? payload.old) as Participation | null;
        if (!row) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
      })
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [matchId, router]);

  function handleEliminate(killerId: string | null) {
    setEliminateOpen(false);
    setPendingKiller(null);
    // Espera server confirmar ANTES de navegar (rede flaky não cancela a action).
    startEliminate(async () => {
      try {
        const res = await eliminateSelf({
          eventId: initial.eventId,
          eliminatedByPlayerId: killerId,
        });
        toast.success(`Você ficou em ${res.finalPosition}º`);
        router.push("/me");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleSwitch(targetTableId: string) {
    setSwitchOpen(false);
    startSwitch(async () => {
      try {
        await switchToTable(targetTableId, initial.eventId);
        router.push(`/me/mesa/${targetTableId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao trocar");
      }
    });
  }

  const otherTables = initial.otherTables.filter((t) => t.state !== "FINALIZADA");

  const { reactions, sendReaction } = useReactions(initial.eventId);
  useAvatarRefresh();
  const mySeat = seats.find((s) => s.isYou);
  function handleReact(emoji: string) { if (mySeat) sendReaction(mySeat.playerId, emoji); }

  // Pré-aquece RSC payload das mesas alternativas.
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
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-ink shadow-[0_8px_24px_-10px_rgba(217,184,118,0.55)] transition-colors hover:bg-gold/90"
      >
        <Coins className="size-4" aria-hidden />
        Meu dinheiro
      </Link>

      {/* Lista textual (acessível, mobile-friendly) */}
      <MesaPlayersList seats={seats} />

      {/* Ações: trocar de mesa + sair eliminado */}
      <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        <SwitchTableDialog
          otherTables={otherTables}
          open={switchOpen}
          onOpenChange={setSwitchOpen}
          pendingSwitch={pendingSwitch}
          onSwitch={handleSwitch}
        />
        <EliminateDialog
          seats={seats}
          open={eliminateOpen}
          onOpenChange={setEliminateOpen}
          pendingKiller={pendingKiller}
          setPendingKiller={setPendingKiller}
          pendingEliminate={pendingEliminate}
          onConfirm={handleEliminate}
        />
      </div>
    </div>
  );
}
