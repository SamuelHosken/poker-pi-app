import { Hero } from "./hero";
import { DesktopGate } from "./desktop-gate";
import { SubscribeForm } from "./subscribe-form";

/**
 * Conteúdo da landing de inscrição, compartilhado entre:
 *  - `/inscrever` (vídeo-convite genérico)
 *  - `/convite/[slug]` (vídeo-convite personalizado da pessoa)
 *
 * O que muda entre as duas é só `videoPublicId`: quando ausente, o Hero usa
 * o vídeo genérico (CONVITE_PUBLIC_ID).
 */
export function Landing({
  videoPublicId,
  conviteSlug,
}: {
  videoPublicId?: string;
  conviteSlug?: string;
}) {
  return (
    <>
      {/* Desktop / tablet: redireciona pro celular */}
      <DesktopGate />

      {/* Celular: experiência completa */}
      <main className="md:hidden">
        <Hero videoPublicId={videoPublicId} />

        <section
          id="inscricao"
          className="relative scroll-mt-4 bg-ink-warm px-5 pb-16 pt-14"
        >
          <header className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-2 font-condensed text-base font-bold uppercase tracking-[0.14em] text-red-bright">
              <span className="h-2.5 w-2.5 rounded-full bg-red-bright" />
              Inscrição
            </span>
            <h2 className="font-condensed text-[clamp(40px,11vw,60px)] font-extrabold uppercase leading-[0.9] tracking-tight text-cream">
              Garanta seu
              <br />
              ingresso<span className="text-red-bright">.</span>
            </h2>
            <p className="max-w-xs text-base leading-relaxed text-cream-soft">
              As vagas são limitadas e por ordem de inscrição. Preencha abaixo
              pra entrar na lista.
            </p>
          </header>

          <div className="mx-auto w-full max-w-md">
            <SubscribeForm conviteSlug={conviteSlug} />
          </div>
        </section>

        <footer className="bg-ink-warm px-5 pb-10 text-center font-condensed text-xs font-bold uppercase tracking-[0.2em] text-ink-warm-soft">
          Poker Pi · O poker é matemática ♠
        </footer>
      </main>
    </>
  );
}
