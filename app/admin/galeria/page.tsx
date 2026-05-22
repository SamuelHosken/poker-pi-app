import Link from "next/link";
import { listChampions } from "@/lib/tournament/galeria";
import { AvatarImage } from "@/components/ui/avatar-image";
import { formatDateBR } from "@/lib/format";

export const metadata = { title: "Galeria de campeões · Poker Pi" };

export default async function GaleriaPage() {
  const champions = await listChampions();

  // Conta por jogador: quem ganhou mais
  const winsByPlayer = new Map<
    string,
    { name: string; nickname: string | null; avatarUrl: string | null; wins: number }
  >();
  for (const c of champions) {
    const key = c.playerName;
    const cur = winsByPlayer.get(key);
    if (cur) {
      cur.wins++;
      // mantém avatar se algum tinha
      if (!cur.avatarUrl && c.avatarUrl) cur.avatarUrl = c.avatarUrl;
    } else {
      winsByPlayer.set(key, {
        name: c.playerName,
        nickname: c.nickname,
        avatarUrl: c.avatarUrl,
        wins: 1,
      });
    }
  }
  const ranking = Array.from(winsByPlayer.values())
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 space-y-8 sm:px-6 sm:py-10">
      <Link
        href="/admin/events"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Eventos
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Hall of fame
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight text-paper sm:text-5xl">
          Campeões
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          {champions.length === 0
            ? "Ainda sem campeões registrados."
            : `${champions.length} torneio${champions.length === 1 ? "" : "s"} encerrado${champions.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {/* Ranking compacto */}
      {ranking.length > 0 && (
        <section className="space-y-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Mais títulos
          </span>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ranking.map((r, i) => (
              <li
                key={r.name}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 ${
                  i === 0 ? "border-gold/60 bg-gold/5" : "border-line bg-ink-2"
                }`}
              >
                <AvatarImage
                  name={r.name}
                  url={r.avatarUrl}
                  size="md"
                  variant={i === 0 ? "gold" : "outline"}
                />
                <div className="text-center">
                  <div className="font-display text-sm text-paper">
                    {r.name.split(" ")[0]}
                  </div>
                  <div
                    className={`font-display text-2xl font-light leading-none ${
                      i === 0 ? "text-gold" : "text-paper/80"
                    }`}
                  >
                    {r.wins}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
                    título{r.wins === 1 ? "" : "s"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lista cronológica */}
      <section className="space-y-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Histórico
        </span>
        {champions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-ink-2 px-6 py-12 text-center font-mono text-xs text-gray-soft">
            Quando um evento encerrar com campeão, ele aparece aqui.
          </div>
        ) : (
          <ul className="space-y-2">
            {champions.map((c) => (
              <li
                key={`${c.eventId}-${c.playerId}`}
                className="flex items-center gap-4 rounded-lg border border-gold/30 bg-gradient-to-r from-gold/5 to-transparent p-4"
              >
                <AvatarImage name={c.playerName} url={c.avatarUrl} size="lg" variant="gold" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl font-light text-paper sm:text-2xl">
                    {c.playerName}
                  </div>
                  {c.nickname && (
                    <div className="font-display text-sm italic text-gold">
                      {c.nickname}
                    </div>
                  )}
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {c.eventName} · {formatDateBR(c.eventDate)}
                    {c.rebuysUsed > 0 && (
                      <> · {c.rebuysUsed} rebuy{c.rebuysUsed === 1 ? "" : "s"}</>
                    )}
                  </div>
                </div>
                <div className="hidden font-display text-4xl font-light text-gold/40 sm:block">
                  🏆
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
