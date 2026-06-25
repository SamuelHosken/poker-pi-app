import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTableForPlayer } from "@/lib/tournament/player-actions";
import { getMyProfile } from "@/lib/tournament/profiles";
import { Badge } from "@/components/ui/badge";
import { tableStateLabel } from "@/lib/ui-labels";
import type { MatchState } from "@/lib/types/domain";
import { MesaView } from "./mesa-view";

export const metadata = {
  title: "Mesa · Poker Pi",
};

export default async function MesaPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  // Profile + view em paralelo — cada um faz auth.getUser independente,
  // então não tem ganho em serializar.
  const [profile, view] = await Promise.all([getMyProfile(), getTableForPlayer(tableId)]);
  if (!profile) redirect("/admin/login");
  if (!view) notFound();

  const tableState = view.table.state as MatchState;
  const isLive = tableState === "JOGANDO";

  return (
    <div className="flex flex-col gap-0">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/me"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Voltar
        </Link>
        {/* Badge à esquerda do header para não colidir com o Toaster (top-right) */}
        <Badge variant={isLive ? "live" : "neutral"}>
          {tableStateLabel(tableState)}
        </Badge>
      </div>

      <header className="mt-4 space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          {view.eventName}
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl">
          Mesa {view.table.table_number}
        </h1>
      </header>

      <MesaView initial={view} />
    </div>
  );
}
