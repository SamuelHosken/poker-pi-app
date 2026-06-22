import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTableForPlayer } from "@/lib/tournament/player-actions";
import { getMyProfile } from "@/lib/tournament/profiles";
import { ChipCalculator } from "./chip-calculator";

export const metadata = {
  title: "Meu dinheiro · Poker Pi",
};

export default async function MoneyPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  // Profile + view em paralelo (cada um faz auth/cookie independente)
  const [profile, view] = await Promise.all([getMyProfile(), getTableForPlayer(tableId)]);
  if (!profile) redirect("/admin/login");
  if (!view) notFound();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/me/mesa/${tableId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Mesa {view.table.table_number}
        </Link>
        <span className="inline-flex rounded-full border border-gold/30 bg-gold/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {profile.name.split(" ")[0]}
        </span>
      </div>

      <header className="mt-4 space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Meu dinheiro
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl">
          Conte suas fichas
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          Toque nas fichas embaixo. Quando estiver pronto, aperte mostrar pra
          aparecer 15s na TV.
        </p>
      </header>

      <ChipCalculator tableId={tableId} />
    </div>
  );
}
