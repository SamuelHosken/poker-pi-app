const STATS = [
  { n: "35", l: "Jogadores" },
  { n: "2", l: "Mesas" },
  { n: "1", l: "Campeão" },
  { n: "14H", l: "Início" },
];

export function StatBand({ stats = STATS }: { stats?: { n: string; l: string }[] }) {
  return (
    <section className="bg-red-brand">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 py-14 sm:grid-cols-4 sm:px-8">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-condensed text-6xl font-extrabold uppercase leading-none text-cream sm:text-7xl">
              {s.n}
            </div>
            <div className="mt-2 font-condensed text-sm font-bold uppercase tracking-[0.2em] text-cream/80">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
