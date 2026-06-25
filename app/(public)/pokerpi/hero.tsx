import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { BlurWord } from "./blur-word";
import { Reveal } from "./reveal";

/**
 * Herói da LP: estética dos vídeos (creme + vermelho-tomate + Big Shoulders).
 * Layout dividido: título gigante condensado de um lado (sobre creme = legível),
 * vídeo dos cortes rápidos emoldurado do outro. Não ocupa tela toda.
 * Footage real (cortes rápidos), comprimido pra web.
 */
const HERO_VIDEO = "/event/fastcuts.mp4";
const HERO_POSTER = "/event/fastcuts-poster.jpg";

export function Hero({
  dateText,
  weekdayTimeText,
  locationShort,
  remaining,
  capacity,
  soldOut,
}: {
  dateText: string;
  weekdayTimeText: string;
  locationShort: string;
  remaining: number | null;
  capacity: number | null;
  soldOut: boolean;
}) {
  return (
    <section className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-20 lg:pt-12">
      {/* Coluna texto */}
      <Reveal className="relative z-[2] flex flex-col">
        <div className="inline-flex items-center gap-2 font-condensed text-base font-bold uppercase tracking-[0.14em] text-red-brand">
          <span className="h-2.5 w-2.5 rounded-full bg-red-brand" />
          2ª Edição · Torneio de Poker
        </div>

        <h1 className="mt-4 font-condensed text-[clamp(56px,13vw,128px)] font-extrabold uppercase leading-[0.9] tracking-[-0.01em] text-red-brand">
          <BlurWord amount={1.5}>Isso</BlurWord> não é
          <br />
          <BlurWord amount={1}>uma</BlurWord> <BlurWord amount={4}>festa.</BlurWord>
        </h1>

        <p className="mt-6 max-w-md text-lg leading-relaxed text-cream sm:text-xl">
          É a 2ª edição do <strong className="font-bold text-cream">Poker Pi</strong>. Um torneio de
          verdade, com jantar, bar e 35 cadeiras. Entre quem você quer ter por perto.
        </p>

        {/* fatos */}
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-condensed text-xl font-bold uppercase tracking-wide text-cream">
          <span>{dateText}</span>
          <span className="h-4 w-px bg-white/20" />
          <span>{weekdayTimeText}</span>
          <span className="h-4 w-px bg-white/20" />
          <span>{locationShort}</span>
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {!soldOut ? (
            <a
              href="#ingressos"
              className="inline-flex h-14 items-center justify-center rounded-full bg-red-brand px-9 font-condensed text-lg font-bold uppercase tracking-wide text-cream transition-transform hover:bg-red-deep active:scale-[0.99]"
            >
              Garantir meu ingresso
            </a>
          ) : (
            <span className="inline-flex h-14 items-center rounded-full bg-white/10 px-9 font-condensed text-lg font-bold uppercase tracking-wide text-cream">
              Esgotado
            </span>
          )}
          {remaining != null && !soldOut && (
            <span className="font-condensed text-lg font-semibold uppercase tracking-wide text-cream-soft">
              {remaining} de {capacity} lugares
            </span>
          )}
        </div>
      </Reveal>

      {/* Coluna vídeo emoldurado */}
      <div className="relative z-[2]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)]">
          <video
            className="aspect-[4/5] w-full object-cover sm:aspect-[3/4] lg:aspect-[4/5]"
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
          {/* selo da marca no canto */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-cream/90 px-3 py-1.5 backdrop-blur-sm">
            <PokerPiLogo className="h-4 w-4 text-red-brand" />
            <span className="font-condensed text-sm font-bold uppercase tracking-wide text-ink-warm">Poker Pi</span>
          </div>
        </div>
      </div>
    </section>
  );
}
