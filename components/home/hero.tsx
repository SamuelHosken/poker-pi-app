import Link from "next/link";
import { HOME } from "./content";

/**
 * Hero da home.
 *  - Mobile: vídeo da moeda como FUNDO atrás do texto (mais imersivo na vertical).
 *  - Desktop (md+): layout em 2 colunas — texto à esquerda, moeda girando menor
 *    à direita, ao lado do texto (sem competir com a leitura).
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink">
      {/* Moeda de fundo — só no mobile */}
      <video
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover md:hidden"
        src="/coin/coin-spin.mp4"
        poster="/coin/coin-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      {/* Gradientes de legibilidade — só no mobile (acompanham o fundo) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 md:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,12,0.82) 0%, rgba(10,10,12,0.30) 30%, rgba(10,10,12,0.20) 55%, rgba(10,10,12,0.72) 82%, rgba(10,10,12,0.98) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 md:hidden"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at center, transparent 36%, rgba(10,10,12,0.55) 86%, rgba(10,10,12,0.9) 100%)",
        }}
      />

      {/* Topo: marca */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-7 sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
          {HOME.brand}
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.26em] text-gray-soft sm:inline">
          {HOME.city}
        </span>
      </header>

      {/* Centro: 1 coluna no mobile, 2 colunas no desktop */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-5 py-14 sm:px-10 sm:py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-10">
        {/* Texto */}
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 self-start border-b border-line/70 pb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-gold before:h-px before:w-6 before:bg-gold before:content-['']">
            Torneios de poker · entre os seus
          </div>

          <h1
            className="mt-7 font-display font-light tracking-[-0.035em] text-white"
            style={{ textShadow: "0 2px 32px rgba(0,0,0,0.55)" }}
          >
            <span className="block text-[clamp(44px,7.5vw,72px)] leading-[0.96]">
              O poker é
            </span>
            <span className="block text-[clamp(44px,7.5vw,72px)] italic font-normal leading-[0.96] text-gold">
              matemática<span className="not-italic text-white">.</span>
            </span>
            <span className="mt-1 block text-[clamp(44px,7.5vw,72px)] leading-[0.96] text-gray-soft">
              O resto é
            </span>
            <span className="block text-[clamp(44px,7.5vw,72px)] italic font-normal leading-[0.96] text-paper">
              narrativa<span className="not-italic text-red-poker">.</span>
            </span>
          </h1>

          <p className="mt-8 max-w-md text-base leading-relaxed text-gray-soft sm:text-lg">
            Uma noite, trinta pessoas, duas mesas até a final. Jantar, open bar e
            um torneio de verdade — entre quem você quer ter por perto.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={HOME.whatsappGroup}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-gold px-8 font-mono text-xs uppercase tracking-[0.18em] text-ink shadow-[0_12px_36px_-10px_rgba(217,184,118,0.7)] transition-all hover:opacity-95 active:scale-[0.99]"
            >
              Entrar no grupo
            </a>
            <Link
              href={HOME.inscreverPath}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-line bg-ink/40 px-8 font-mono text-xs uppercase tracking-[0.18em] text-paper backdrop-blur-md transition-colors hover:border-gold hover:text-gold"
            >
              Garantir presença
            </Link>
          </div>
        </div>

        {/* Moeda à direita — só no desktop */}
        <div className="relative hidden items-center justify-center md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 55% 50%, rgba(217,184,118,0.20), rgba(10,10,12,0) 65%)",
            }}
          />
          <video
            className="relative w-full max-w-[480px] object-contain [mix-blend-mode:screen]"
            style={{
              // screen tira o grosso do fundo escuro do vídeo; a máscara esfuma
              // a borda do retângulo que ainda sobra. Juntos = moeda flutuando.
              WebkitMaskImage:
                "radial-gradient(ellipse 66% 60% at 50% 50%, #000 55%, transparent 82%)",
              maskImage:
                "radial-gradient(ellipse 66% 60% at 50% 50%, #000 55%, transparent 82%)",
            }}
            src="/coin/coin-spin.mp4"
            poster="/coin/coin-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
        </div>
      </div>

      {/* Rodapé do hero: cue de scroll */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-8 sm:px-10">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gray-mid">
          <span aria-hidden className="text-gold motion-safe:animate-bounce">
            ↓
          </span>
          O que é o Poker Pi
        </span>
      </div>
    </section>
  );
}
