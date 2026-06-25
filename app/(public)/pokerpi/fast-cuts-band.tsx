/**
 * Faixa imersiva no meio da LP — vídeo de cortes rápidos (energia da noite)
 * em loop, com uma linha de copy por cima. Mobile-first.
 *
 * PLACEHOLDER: usa /login-bg.mp4 (existe). Trocar BAND_VIDEO por
 * /event/fastcuts.mp4 quando o footage de cortes rápidos chegar.
 */
const BAND_VIDEO = "/login-bg.mp4";

export function FastCutsBand() {
  return (
    <section className="relative isolate flex min-h-[78vh] items-center justify-center overflow-hidden bg-ink">
      <div aria-hidden className="absolute inset-0 -z-20 bg-ink" />
      <video
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-70 motion-reduce:hidden"
        src={BAND_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #0a0a0c 0%, rgba(10,10,12,0.55) 26%, rgba(10,10,12,0.55) 74%, #0a0a0c 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">A 1ª edição</p>
        <h2
          className="mt-5 font-display text-[clamp(30px,6.5vw,52px)] font-light leading-[1.02] tracking-[-0.02em] text-white"
          style={{ textShadow: "0 2px 36px rgba(0,0,0,0.65)" }}
        >
          Cartas na mesa, <span className="italic text-gold">história</span> sendo escrita.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-gray-soft">
          Agora vem a segunda. Garanta seu lugar antes que as fichas acabem.
        </p>
      </div>
    </section>
  );
}
