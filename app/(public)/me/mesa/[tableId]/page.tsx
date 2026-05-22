import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTableForPlayer } from "@/lib/tournament/player-actions";
import { getMyProfile } from "@/lib/tournament/profiles";
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

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/me"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Voltar
        </Link>
        <span className="inline-flex rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {view.table.state}
        </span>
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
    </main>
  );
}
