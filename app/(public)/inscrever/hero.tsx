/**
 * Hero da inscrição na identidade da LP de ingressos (creme + vermelho + Big
 * Shoulders). Vídeo da moeda ao fundo, título condensado gigante e a chamada
 * pra descer ao formulário. Mobile-first (a landing inteira é md:hidden).
 */
import { InviteVideo } from "./invite-video";
import { Reveal } from "../pokerpi/reveal";
import { FlickerText } from "../pokerpi/flicker-text";
import { BlurWord } from "../pokerpi/blur-word";

export function Hero({ videoPublicId }: { videoPublicId?: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink-warm px-6 pb-0 pt-16"
    >
      {/* Vídeo de fundo da moeda */}
      <video
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
        src="/coin/coin-spin.mp4"
        poster="/coin/coin-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      {/* Scrims (tons quentes do ink-warm) pra legibilidade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(23,18,15,0.82) 0%, rgba(23,18,15,0.15) 24%, rgba(23,18,15,0) 46%, rgba(23,18,15,0) 56%, rgba(23,18,15,0.62) 82%, rgba(23,18,15,0.98) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at center, transparent 38%, rgba(23,18,15,0.5) 84%, rgba(23,18,15,0.88) 100%)",
        }}
      />

      <Reveal className="relative z-10 flex flex-1 flex-col">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 font-condensed text-base font-bold uppercase tracking-[0.14em] text-red-bright">
          <span className="h-2.5 w-2.5 rounded-full bg-red-bright" />
          <FlickerText>2ª Edição · Poker Pi</FlickerText>
        </div>

        {/* Título */}
        <h1
          id="hero-title"
          className="mt-5 font-condensed text-[clamp(52px,15vw,88px)] font-extrabold uppercase leading-[0.9] tracking-[-0.01em] text-cream"
          style={{ textShadow: "0 2px 28px rgba(0,0,0,0.55)" }}
        >
          <BlurWord amount={0.6}>O poker</BlurWord>
          <br />
          mais <BlurWord amount={1}>irado</BlurWord>
          <span className="text-red-bright">.</span>
          <span className="mt-3 block text-[clamp(18px,5vw,26px)] font-bold italic tracking-normal text-cream-soft">
            está de volta<span className="text-red-bright">.</span>
          </span>
        </h1>

        <div className="flex-1" />

        {/* Assistir o convite + descer pro formulário */}
        <div className="mb-8 flex flex-col items-center gap-5">
          <InviteVideo publicId={videoPublicId} />

          <a
            href="#inscricao"
            className="group inline-flex flex-col items-center gap-1.5 text-center"
            aria-label="Ir para a inscrição"
          >
            <span className="font-condensed text-sm font-bold uppercase tracking-[0.18em] text-cream-soft transition-colors group-hover:text-cream">
              Garanta seu ingresso
            </span>
            <span aria-hidden className="text-lg text-red-bright motion-safe:animate-bounce">
              ↓
            </span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}
