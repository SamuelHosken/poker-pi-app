import { PokerPiLogo } from "@/components/ui/poker-pi-logo";

/**
 * Herói da LP de ingressos: vídeo de fundo em loop (slow-mo da 1ª edição),
 * escurecido, com a marca + data + vagas + CTA por cima. Mobile-first.
 *
 * Footage real da 1ª edição (slow-mo), comprimido pra web.
 */
const HERO_VIDEO = "/event/slowmo.mp4";
const HERO_POSTER = "/event/slowmo-poster.jpg";

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
    <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-ink">
      {/* fallback de gradiente (caso o vídeo não carregue) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{ background: "radial-gradient(ellipse 90% 70% at 50% 18%, #1b150a 0%, #0a0a0c 60%)" }}
      />
      {/* vídeo de fundo */}
      <video
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-80 motion-reduce:hidden"
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      {/* gradientes de legibilidade */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,12,0.78) 0%, rgba(10,10,12,0.32) 28%, rgba(10,10,12,0.40) 58%, rgba(10,10,12,0.88) 84%, #0a0a0c 100%)",
        }}
      />

      {/* topo: marca */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <PokerPiLogo className="h-7 w-7 text-gold" />
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Poker Pi</span>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-gray-soft sm:inline">
          {locationShort}
        </span>
      </header>

      {/* centro */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-gold before:h-px before:w-7 before:bg-gold before:content-[''] after:h-px after:w-7 after:bg-gold after:content-['']">
          2ª Edição
        </div>

        <h1
          className="mt-6 font-display font-light leading-[0.92] tracking-[-0.03em] text-white"
          style={{ textShadow: "0 2px 40px rgba(0,0,0,0.6)" }}
        >
          <span className="block text-[clamp(40px,11vw,84px)]">{dateText}</span>
        </h1>
        <p className="mt-4 font-mono text-sm uppercase tracking-[0.22em] text-gold-soft">{weekdayTimeText}</p>
        <p className="mt-3 max-w-md text-base leading-relaxed text-gray-soft">
          Uma noite, trinta lugares, uma mesa até a final. Jantar, bar e um torneio de
          verdade, entre quem você quer ter por perto.
        </p>

        {remaining != null && (
          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.22em] text-gold/90">
            {soldOut ? "● Esgotado" : `● ${remaining} de ${capacity} lugares`}
          </p>
        )}

        {!soldOut && (
          <a
            href="#ingressos"
            className="mt-7 inline-flex h-14 items-center justify-center rounded-full bg-gold px-9 font-mono text-xs uppercase tracking-[0.18em] text-ink shadow-[0_14px_40px_-10px_rgba(217,184,118,0.7)] transition-all hover:opacity-95 active:scale-[0.99]"
          >
            Garantir meu ingresso
          </a>
        )}
      </div>

      {/* cue de scroll */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-7 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gray-mid">
          <span aria-hidden className="text-gold motion-safe:animate-bounce">↓</span>
          A noite
        </span>
      </div>
    </section>
  );
}
