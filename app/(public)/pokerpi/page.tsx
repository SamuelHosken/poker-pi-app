import { getActiveEventPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { CheckoutForm } from "./checkout-form";
import { Hero } from "./hero";
import { StatBand } from "./stat-band";
import { TheNight } from "./the-night";
import { GalleryStrip } from "./gallery-strip";
import { VenueSchedule } from "./venue-schedule";
import { Faq } from "./faq";
import { GoldTicketArt } from "./gold-ticket-art";

export const dynamic = "force-dynamic";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function PokerPiPage() {
  const data = await getActiveEventPublic();

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink-warm px-5 text-center text-cream">
        <PokerPiLogo className="h-16 w-16 text-red-brand" />
        <p className="mt-6 font-condensed text-3xl font-bold uppercase">Sem evento aberto agora</p>
        <p className="mt-2 text-sm text-cream-soft">Fique de olho. Em breve.</p>
      </main>
    );
  }

  const { event, ticketTypes, soldCount } = data;
  const soldOut = !event.salesOpen || !hasCapacity(soldCount, event.capacity);
  const remaining = event.capacity != null ? Math.max(0, event.capacity - soldCount) : null;

  const start = new Date(event.startsAt);
  const dateText = start.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const weekday = capitalize(start.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }));
  const time = start
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    .replace(":00", "h")
    .replace(":", "h");
  const weekdayTimeText = `${weekday} · ${time}`;
  const locationShort = (event.locationText.split(",").pop() ?? event.locationText).trim();

  const stats = [
    { n: String(event.capacity ?? 35), l: "Lugares" },
    { n: "2", l: "Mesas" },
    { n: "1", l: "Campeão" },
    { n: time.toUpperCase(), l: "Início" },
  ];

  return (
    <main className="bg-ink-warm text-cream">
      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink-warm/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <PokerPiLogo className="h-7 w-7 text-red-brand" />
            <span className="font-condensed text-xl font-bold uppercase tracking-wide text-cream">Poker Pi</span>
          </div>
          {!soldOut && (
            <a
              href="#ingressos"
              className="inline-flex h-10 items-center rounded-full bg-red-brand px-5 font-condensed text-sm font-bold uppercase tracking-wide text-cream transition-colors hover:bg-red-deep"
            >
              Garantir ingresso
            </a>
          )}
        </div>
      </nav>

      <Hero
        dateText={dateText}
        weekdayTimeText={weekdayTimeText}
        locationShort={locationShort}
        remaining={remaining}
        capacity={event.capacity}
        soldOut={soldOut}
      />

      <StatBand stats={stats} />

      <TheNight />

      {/* INGRESSOS */}
      <section id="ingressos" className="border-y border-white/10 bg-ink-warm">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">Os ingressos</p>
            <h2 className="mt-3 font-condensed text-[clamp(40px,9vw,92px)] font-extrabold uppercase leading-[0.93] text-cream">
              Garanta seu lugar
            </h2>
            <p className="mt-4 max-w-md text-lg text-cream-soft">
              {remaining != null && !soldOut ? `Restam ${remaining} de ${event.capacity} lugares. ` : ""}
              Escolha seu plano e finalize em menos de um minuto.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div className="order-1 mx-auto w-full max-w-[340px] lg:order-none lg:sticky lg:top-20 lg:max-w-[520px]">
              <GoldTicketArt />
              <p className="mt-6 text-center font-condensed text-lg font-bold uppercase tracking-[0.16em] text-cream-soft">
                Seu lugar na mesa
              </p>
            </div>
            <div className="order-2 lg:order-none">
              <CheckoutForm types={ticketTypes} soldOut={soldOut} />
            </div>
          </div>
        </div>
      </section>

      <GalleryStrip />

      <VenueSchedule locationText={event.locationText} />

      <Faq />

      {/* CTA FINAL */}
      {!soldOut && (
        <section className="bg-red-brand">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-20 text-center sm:px-8">
            <h2 className="font-condensed text-[clamp(40px,9vw,96px)] font-extrabold uppercase leading-[0.93] text-cream">
              Te vejo na mesa?
            </h2>
            <a
              href="#ingressos"
              className="inline-flex h-14 items-center rounded-full bg-cream px-10 font-condensed text-xl font-bold uppercase tracking-wide text-red-brand transition-transform hover:bg-cream-2 active:scale-[0.99]"
            >
              Garantir meu ingresso
            </a>
          </div>
        </section>
      )}

      {/* RODAPÉ */}
      <footer className="bg-ink-warm px-5 py-12 text-center">
        <PokerPiLogo className="mx-auto h-9 w-9 text-cream" />
        <p className="mt-3 font-condensed text-base font-bold uppercase tracking-[0.2em] text-cream">Poker Pi</p>
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-cream/60">
          {locationShort}. Lotação limitada a {event.capacity ?? ""} lugares. O ingresso é pessoal e chega por e-mail com QR para check-in.
        </p>
      </footer>
    </main>
  );
}
