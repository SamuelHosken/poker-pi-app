/**
 * Hero da landing de inscrição — moeda girando em vídeo de fundo, no mesmo
 * espírito do site principal do PokerPi, mas SEM seções de preço/estrutura
 * abaixo. O foco é descer pro formulário.
 *
 * Para trocar o vídeo: substitua /public/coin/coin-spin.mp4 (e o poster
 * coin-poster.jpg) pelo novo corte.
 */
import { InviteVideo } from "./invite-video";

export function Hero({ videoPublicId }: { videoPublicId?: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink px-6 pt-16 pb-0"
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
      {/* Gradientes pra legibilidade do texto sobre o vídeo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,11,0.80) 0%, rgba(10,10,11,0.15) 24%, rgba(10,10,11,0) 44%, rgba(10,10,11,0) 58%, rgba(10,10,11,0.6) 82%, rgba(10,10,11,0.98) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at center, transparent 38%, rgba(10,10,11,0.5) 84%, rgba(10,10,11,0.85) 100%)",
        }}
      />

      {/* Eyebrow */}
      <div className="relative z-10 mb-6 inline-flex items-center gap-2 border-b border-line/70 pb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gold before:h-px before:w-6 before:bg-gold before:content-['']">
        PokerPi · Nova edição
      </div>

      {/* Título */}
      <h1
        id="hero-title"
        className="relative z-10 font-display font-light tracking-[-0.035em] text-white"
        style={{ textShadow: "0 2px 28px rgba(0,0,0,0.6)" }}
      >
        <span className="block text-[clamp(44px,13vw,84px)] leading-[0.95]">
          O poker
        </span>
        <span className="block text-[clamp(44px,13vw,84px)] leading-[0.95]">
          mais{" "}
          <em className="not-italic italic font-normal text-gold">irado</em>
          <span className="text-white">.</span>
        </span>
        <span className="mt-5 block font-display text-[clamp(15px,3.8vw,22px)] font-light italic leading-[1.3] text-gray-soft">
          está de volta<span className="text-red-poker">.</span>
        </span>
      </h1>

      {/* Empurra o conteúdo de baixo pro rodapé do hero */}
      <div className="flex-1" />

      {/* Assistir o convite (toca na moeda → abre o vídeo) */}
      <div className="relative z-10 mb-7 flex flex-col items-center gap-5">
        <InviteVideo publicId={videoPublicId} />

        {/* Seta pra descer ao formulário */}
        <a
          href="#inscricao"
          className="group inline-flex flex-col items-center gap-1.5 text-center"
          aria-label="Ir para a inscrição"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-soft transition-colors group-hover:text-paper">
            Garanta seu ingresso
          </span>
          <span aria-hidden className="text-lg text-gold motion-safe:animate-bounce">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
