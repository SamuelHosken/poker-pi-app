import { MapPin } from "lucide-react";

export function VenueSection({ locationText }: { locationText: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
  return (
    <section className="mx-auto w-full max-w-xl px-5 py-16">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Onde</p>
      <div className="mt-5 rounded-3xl border border-line bg-ink-2/60 p-6 text-center">
        <MapPin className="mx-auto h-7 w-7 text-gold" strokeWidth={1.6} />
        <p className="mt-4 text-lg font-medium leading-snug text-paper">{locationText}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-line bg-ink/40 px-7 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:border-gold hover:text-gold"
        >
          Ver no mapa
        </a>
      </div>
    </section>
  );
}
