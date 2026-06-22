import { Hero } from "./hero";
import { DesktopGate } from "./desktop-gate";
import { SubscribeForm } from "./subscribe-form";

/**
 * Conteúdo da landing de inscrição, compartilhado entre:
 *  - `/inscrever` (vídeo-convite genérico)
 *  - `/convite/[slug]` (vídeo-convite personalizado da pessoa)
 *
 * O que muda entre as duas é só `videoPublicId` — quando ausente, o Hero usa
 * o vídeo genérico (CONVITE_PUBLIC_ID).
 */
export function Landing({ videoPublicId }: { videoPublicId?: string }) {
  return (
    <>
      {/* Desktop / tablet: redireciona pro celular */}
      <DesktopGate />

      {/* Celular: experiência completa */}
      <main className="md:hidden">
        <Hero videoPublicId={videoPublicId} />

        <section
          id="inscricao"
          className="relative scroll-mt-4 bg-ink px-5 pb-16 pt-12"
        >
          <header className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
              Inscrição
            </span>
            <h2 className="font-display text-[clamp(30px,8.5vw,46px)] font-light leading-[0.98] tracking-tight text-paper">
              Garanta seu
              <br />
              <em className="not-italic italic text-gold">ingresso</em>
              <span className="text-red-poker">.</span>
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-soft">
              As vagas são limitadas e por ordem de inscrição. Preencha abaixo
              para entrar na lista.
            </p>
          </header>

          <div className="mx-auto w-full max-w-md">
            <SubscribeForm />
          </div>
        </section>

        <footer className="bg-ink px-5 pb-10 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
          PokerPi · O poker é matemática ♠
        </footer>
      </main>
    </>
  );
}
