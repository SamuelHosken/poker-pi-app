/**
 * Igual ao site principal: a experiência foi desenhada pro celular. Em telas
 * >= md mostramos uma mensagem pedindo pra abrir no telefone. O conteúdo real
 * (hero + formulário) fica em `md:hidden`.
 */
export function DesktopGate() {
  return (
    <div className="hidden min-h-svh flex-col items-center justify-center bg-ink px-12 text-center md:flex">
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
        PokerPi · Nova edição
      </span>

      <h1
        className="mt-12 max-w-3xl font-display text-[clamp(48px,6vw,88px)] font-light leading-[0.95] tracking-[-0.035em] text-white"
        style={{ textShadow: "0 2px 28px rgba(0,0,0,0.6)" }}
      >
        A inscrição é{" "}
        <em className="not-italic italic text-gold">para fazer no celular</em>
        <span className="text-red-poker">.</span>
      </h1>

      <p className="mt-8 max-w-md font-display text-[clamp(18px,1.6vw,22px)] font-light italic leading-[1.5] text-gray-soft">
        Abra esta página no seu telefone — todo o formulário foi desenhado para
        a tela pequena.
      </p>

      <div className="mt-16 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
        <span aria-hidden className="h-px w-8 bg-line" />
        Garanta sua vaga
        <span aria-hidden className="h-px w-8 bg-line" />
      </div>
    </div>
  );
}
