import Link from "next/link";
import { HOME } from "./content";

/**
 * Hero da home institucional — vídeo da moeda de fundo (mesmo do /inscrever),
 * com a tagline e os dois caminhos: entrar no grupo (WhatsApp) e garantir
 * presença (/inscrever). Responsivo desktop + mobile.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink">
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
      {/* Gradientes pra legibilidade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,12,0.82) 0%, rgba(10,10,12,0.30) 30%, rgba(10,10,12,0.20) 55%, rgba(10,10,12,0.72) 82%, rgba(10,10,12,0.98) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
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

      {/* Centro */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-14 sm:px-10 sm:py-16">
        <div className="inline-flex items-center gap-2 self-start border-b border-line/70 pb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-gold before:h-px before:w-6 before:bg-gold before:content-['']">
          Torneios de poker · entre os seus
        </div>

        <h1
          className="mt-7 max-w-3xl font-display font-light tracking-[-0.035em] text-white"
          style={{ textShadow: "0 2px 32px rgba(0,0,0,0.6)" }}
        >
          <span className="block text-[clamp(44px,8vw,104px)] leading-[0.95]">
            O poker é
            <span className="italic font-normal text-gold"> matemática</span>.
          </span>
          <span className="mt-2 block text-[clamp(44px,8vw,104px)] leading-[0.95] text-gray-soft">
            O resto é
            <span className="italic font-normal text-paper"> narrativa</span>
            <span className="text-red-poker">.</span>
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-gray-soft sm:text-lg">
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
