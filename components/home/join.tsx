import Link from "next/link";
import { HOME } from "./content";

/**
 * CTA final — entrar no grupo (WhatsApp, canal oficial) e garantir presença.
 * Transmite exclusividade sem prometer data específica.
 */
export function Join() {
  return (
    <section className="relative overflow-hidden bg-ink px-6 py-28 sm:px-10 sm:py-36">
      {/* Brilho dourado */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(217,184,118,0.16), rgba(10,10,12,0) 60%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Próxima edição
        </span>
        <h2 className="mt-5 font-display text-[clamp(36px,7vw,76px)] font-light leading-[0.98] tracking-tight text-paper">
          Faça parte da
          <br />
          <em className="not-italic italic text-gold">próxima noite</em>
          <span className="text-red-poker">.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-gray-soft">
          As vagas são limitadas e por ordem de inscrição. Entre no grupo pra
          ficar por dentro, ou garanta sua presença agora.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={HOME.whatsappGroup}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gold px-8 font-mono text-xs uppercase tracking-[0.18em] text-ink shadow-[0_12px_36px_-10px_rgba(217,184,118,0.7)] transition-all hover:opacity-95 active:scale-[0.99] sm:w-auto"
          >
            Entrar no grupo do WhatsApp
          </a>
          <Link
            href={HOME.inscreverPath}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-ink-2 px-8 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-colors hover:border-gold hover:text-gold sm:w-auto"
          >
            Garantir presença
          </Link>
        </div>
      </div>
    </section>
  );
}
