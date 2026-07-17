import type { Metadata } from "next";
import { getActiveEventPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { CheckoutForm } from "./checkout-form";
import { Hero } from "./hero";
import { StatBand } from "./stat-band";
import { TheNight } from "./the-night";
import { PremiacaoScroll } from "./premiacao-scroll";
import { GalleryStrip } from "./gallery-strip";
import { VenueSchedule } from "./venue-schedule";
import { Countdown } from "./countdown";
import { Faq } from "./faq";
import { GoldTicketArt } from "./gold-ticket-art";
import { BlurWord } from "./blur-word";
import { FlickerText } from "./flicker-text";
import { Reveal } from "./reveal";
import { AnalyticsTracker } from "./analytics-tracker";
import { CtaLink } from "./cta-link";

export const dynamic = "force-dynamic";

const TITLE = "Poker Pi · 2ª Edição";
const DESCRIPTION =
  "Um torneio de poker de verdade, com jantar e bar, em Brasília. 30 lugares. Garanta o seu.";

// Liga o reveal-ao-rolar ANTES da pintura (sem flash) e, se o bundle não
// inicializar em 3s, remove .js-reveal pra garantir que o conteúdo apareça.
// Ver reveal.tsx + .pp-reveal em globals.css.
const REVEAL_BOOT =
  "(function(){try{var d=document.documentElement;d.classList.add('js-reveal');setTimeout(function(){if(!window.__ppRevealReady){d.classList.remove('js-reveal');}},3000);}catch(e){}})();";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      type: "website",
      url: "/pokerpi",
      siteName: "Poker Pi",
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function PokerPiPage() {
  const data = await getActiveEventPublic();

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink-warm px-5 text-center text-cream">
        <PokerPiLogo className="h-16 w-16 text-red-bright" />
        <p className="mt-6 font-condensed text-3xl font-bold uppercase">Sem evento aberto agora</p>
        <p className="mt-2 text-sm text-cream-soft">Fique de olho. Em breve.</p>
      </main>
    );
  }

  const { event, ticketTypes, soldCount } = data;
  const soldOut = !event.salesOpen || !hasCapacity(soldCount, event.capacity);

  const start = new Date(event.startsAt);
  const dateText = start.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const weekday = capitalize(start.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }));
  // Horário de vitrine no hero: 14h (abertura da casa). O torneio começa 16h (ver programação).
  const weekdayTimeText = `${weekday} · 14h`;
  const locationShort = (event.locationText.split(",").pop() ?? event.locationText).trim();

  const stats = [
    { n: "30", l: "Lugares" },
    { n: "3", l: "Mesas" },
    { n: "1", l: "Campeão" },
    { n: "14H", l: "Abertura" },
  ];

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
      <main className="bg-ink-warm text-cream">
      <AnalyticsTracker eventId={event.id} />

      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink-warm/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <PokerPiLogo className="h-7 w-7 text-red-bright" />
            <span className="font-condensed text-xl font-bold uppercase tracking-wide text-cream">Poker Pi</span>
          </div>
          {!soldOut && (
            <CtaLink
              eventId={event.id}
              className="inline-flex h-10 items-center rounded-full bg-red-bright px-5 font-condensed text-sm font-bold uppercase tracking-wide text-cream transition-colors hover:bg-red-deep"
            >
              Garantir ingresso
            </CtaLink>
          )}
        </div>
      </nav>

      <Hero
        eventId={event.id}
        dateText={dateText}
        weekdayTimeText={weekdayTimeText}
        locationShort={locationShort}
        soldOut={soldOut}
      />

      <StatBand stats={stats} />

      <TheNight />

      <PremiacaoScroll eventId={event.id} soldOut={soldOut} />

      {/* INGRESSOS */}
      <section id="ingressos" className="border-y border-white/10 bg-ink-warm">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-bright">
              <FlickerText>Os ingressos</FlickerText>
            </p>
            <h2 className="mt-3 font-condensed text-[clamp(40px,9vw,92px)] font-extrabold uppercase leading-[0.93] text-cream">
              Garanta seu <BlurWord>lugar</BlurWord>
            </h2>
            <p className="mt-4 max-w-md text-lg text-cream-soft">
              Escolha seu plano e finalize em menos de um minuto.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/60">
              O ingresso cobre o jantar e o bar. A entrada do torneio (buy-in de R$ 25) é paga à
              parte, no dia.
            </p>
          </Reveal>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <Reveal className="order-1 mx-auto w-full max-w-[340px] lg:order-none lg:sticky lg:top-20 lg:max-w-[520px]">
              <GoldTicketArt />
              <p className="mt-6 text-center font-condensed text-lg font-bold uppercase tracking-[0.16em] text-cream-soft">
                Seu lugar na mesa
              </p>
            </Reveal>
            <Reveal delay={0.12} className="order-2 lg:order-none">
              <CheckoutForm types={ticketTypes} soldOut={soldOut} eventId={event.id} />
            </Reveal>
          </div>
        </div>
      </section>

      <GalleryStrip />

      <VenueSchedule locationText={event.locationText} eventId={event.id} />

      <Countdown targetIso={event.startsAt} />

      <Faq eventId={event.id} />

      {/* CTA FINAL */}
      {!soldOut && (
        <section className="bg-red-bright">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-20 text-center sm:px-8">
            <h2 className="font-condensed text-[clamp(40px,9vw,96px)] font-extrabold uppercase leading-[0.93] text-cream">
              Te <BlurWord amount={0.6}>vejo</BlurWord> na <BlurWord>mesa?</BlurWord>
            </h2>
            <CtaLink
              eventId={event.id}
              className="inline-flex h-14 items-center rounded-full bg-cream px-10 font-condensed text-xl font-bold uppercase tracking-wide text-red-bright transition-transform hover:bg-cream-2 active:scale-[0.99]"
            >
              Garantir meu ingresso
            </CtaLink>
          </Reveal>
        </section>
      )}

      {/* RODAPÉ */}
      <footer className="bg-ink-warm px-5 py-12 text-center">
        <PokerPiLogo className="mx-auto h-9 w-9 text-cream" />
        <p className="mt-3 font-condensed text-base font-bold uppercase tracking-[0.2em] text-cream">
          <FlickerText>Poker Pi</FlickerText>
        </p>
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-cream/60">
          {locationShort}. Lotação limitada a 30 lugares. O ingresso é pessoal e chega por e-mail com QR para check-in.
        </p>
      </footer>
      </main>
    </>
  );
}
