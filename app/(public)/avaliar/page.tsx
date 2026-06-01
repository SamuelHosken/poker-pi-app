import { FeedbackForm } from "./feedback-form";

export const metadata = {
  title: "Avalie o PokerPi",
  description: "Conta pra gente como foi o último PokerPi.",
  openGraph: {
    title: "Avalie o PokerPi",
    description: "Como foi a sua noite? Leva 1 minuto e sua opinião monta o próximo.",
    type: "website",
    url: "/avaliar",
    images: [
      {
        url: "/og-avaliar.jpg",
        width: 1200,
        height: 434,
        type: "image/jpeg",
        alt: "Poker Pi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Avalie o PokerPi",
    description: "Como foi a sua noite? Leva 1 minuto e sua opinião monta o próximo.",
    images: ["/og-avaliar.jpg"],
  },
};

export default function AvaliarPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
          PokerPi · Avaliação
        </span>
        <h1 className="font-display text-[clamp(34px,9vw,52px)] font-light leading-[0.95] tracking-tight text-paper">
          Como foi a<br />
          <em className="not-italic italic text-gold">sua noite</em>
          <span className="text-red-poker">?</span>
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-gray-soft">
          Você esteve no último <span className="text-paper">PokerPi</span>. Leva 1
          minuto e sua opinião monta o próximo.
        </p>
      </header>

      <FeedbackForm />

      <footer className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
        Respostas anônimas · obrigado por jogar ♠
      </footer>
    </main>
  );
}
