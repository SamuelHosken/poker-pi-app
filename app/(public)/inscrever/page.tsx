import type { Metadata } from "next";
import { Landing } from "./landing";

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
  return <Landing />;
}
