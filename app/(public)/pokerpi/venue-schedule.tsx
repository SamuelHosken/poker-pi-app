import { MapPin } from "lucide-react";

const SCHEDULE = [
  { t: "14h00", l: "Abertura da casa" },
  { t: "15h30", l: "Chegada e credenciamento" },
  { t: "17h00", l: "Começa o torneio" },
];

export function VenueSchedule({ locationText }: { locationText: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="grid gap-14 lg:grid-cols-2">
        {/* Programação */}
        <div>
          <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">A programação</p>
          <h2 className="mt-3 font-condensed text-[clamp(34px,7vw,64px)] font-extrabold uppercase leading-[0.9] text-ink-warm">
            O dia
          </h2>
          <div className="mt-8">
            {SCHEDULE.map((s) => (
              <div key={s.l} className="flex items-baseline gap-5 border-b border-cream-3 py-5">
                <span className="w-28 shrink-0 font-condensed text-4xl font-extrabold leading-none text-red-brand sm:text-5xl">
                  {s.t}
                </span>
                <span className="font-condensed text-xl font-bold uppercase leading-tight text-ink-warm">{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Local */}
        <div>
          <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">O lugar</p>
          <div className="mt-3 rounded-3xl border border-cream-3 bg-cream-2 p-8">
            <MapPin className="h-8 w-8 text-red-brand" strokeWidth={2} />
            <p className="mt-5 text-2xl font-medium leading-snug text-ink-warm">{locationText}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex h-12 items-center rounded-full bg-ink-warm px-7 font-condensed text-base font-bold uppercase tracking-wide text-cream transition-colors hover:bg-red-brand"
            >
              Ver no mapa
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
