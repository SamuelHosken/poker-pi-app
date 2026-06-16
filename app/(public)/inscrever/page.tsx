import type { Metadata } from "next";
import { Hero } from "./hero";
import { DesktopGate } from "./desktop-gate";
import { SubscribeForm } from "./subscribe-form";

export const metadata: Metadata = {
  title: "Inscreva-se · PokerPi",
  description:
    "Garanta seu ingresso na nova edição do PokerPi. Inscrição rápida: nome, e-mail e telefone.",
  openGraph: {
    title: "Inscreva-se · PokerPi",
    description: "A nova edição do PokerPi está chegando. Garanta sua vaga.",
    type: "website",
    url: "/inscrever",
  },
  robots: { index: true, follow: true },
};

export default function InscreverPage() {
  return (
    <>
      {/* Desktop / tablet: redireciona pro celular */}
      <DesktopGate />

      {/* Celular: experiência completa */}
      <main className="md:hidden">
        <Hero />

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
