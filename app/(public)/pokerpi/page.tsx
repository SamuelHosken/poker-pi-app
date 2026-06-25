import { getActiveEventPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { CheckoutForm } from "./checkout-form";
import { Hero } from "./hero";
import { FastCutsBand } from "./fast-cuts-band";
import { VenueSection } from "./venue-section";
import { GoldTicketArt } from "./gold-ticket-art";

export const dynamic = "force-dynamic";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function PokerPiPage() {
  const data = await getActiveEventPublic();

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-5 text-center text-paper">
        <PokerPiLogo className="h-16 w-16 text-gold" />
        <p className="mt-6 text-lg">Nenhum evento com vendas abertas no momento.</p>
        <p className="mt-2 text-sm text-gray-soft">Fique de olho — em breve.</p>
      </main>
    );
  }

  const { event, ticketTypes, soldCount } = data;
  const soldOut = !event.salesOpen || !hasCapacity(soldCount, event.capacity);
  const remaining = event.capacity != null ? Math.max(0, event.capacity - soldCount) : null;

  const start = new Date(event.startsAt);
  const dateText = start.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
  const weekday = capitalize(
    start.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }),
  );
  const time = start
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    .replace(":00", "h")
    .replace(":", "h");
  const weekdayTimeText = `${weekday} · ${time}`;
  const locationShort = (event.locationText.split("—").pop() ?? event.locationText).trim();

  return (
    <main className="bg-ink text-paper">
      <Hero
        dateText={dateText}
        weekdayTimeText={weekdayTimeText}
        locationShort={locationShort}
        remaining={remaining}
        capacity={event.capacity}
        soldOut={soldOut}
      />

      <FastCutsBand />

      <VenueSection locationText={event.locationText} />

      {/* INGRESSOS / CHECKOUT */}
      <section id="ingressos" className="mx-auto w-full max-w-5xl px-5 pb-24 pt-4">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Garanta seu lugar</p>
          <h2 className="mt-4 font-display text-[clamp(28px,6vw,44px)] font-light tracking-tight text-paper">
            Seu ingresso
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-soft">
            Pagamento via PIX ou cartão. Você recebe o ingresso com QR Code na hora — e por e-mail.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* arte decorativa do ingresso */}
          <div className="order-1 mx-auto max-w-[220px] lg:order-none lg:sticky lg:top-16 lg:max-w-[320px]">
            <GoldTicketArt />
            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-gray-mid">
              Seu lugar na mesa
            </p>
          </div>

          {/* checkout */}
          <div className="order-2 lg:order-none">
            <CheckoutForm types={ticketTypes} soldOut={soldOut} />
          </div>
        </div>
      </section>

      {/* rodapé */}
      <footer className="border-t border-line/60 px-5 py-10 text-center">
        <PokerPiLogo className="mx-auto h-8 w-8 text-gold/80" />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-gray-mid">
          Poker Pi · {locationShort}
        </p>
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-gray-mid">
          Lotação limitada a {event.capacity ?? "—"} lugares. O ingresso é pessoal e chega por e-mail com QR para check-in.
        </p>
      </footer>
    </main>
  );
}
