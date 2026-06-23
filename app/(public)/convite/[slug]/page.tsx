import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "../../inscrever/landing";
import { getConvite } from "../../inscrever/convites";
import { ConviteOpenTracker } from "./convite-open-tracker";

/**
 * Landing de inscrição PERSONALIZADA. Cada pessoa convidada recebe um link
 * `/convite/<slug>` — a página é igual à `/inscrever`, mas o botão "Assistir o
 * convite" toca o vídeo da pessoa (que já começa falando o nome dela).
 *
 * Slug desconhecido → 404 (não cai no genérico de propósito: link errado deve
 * dar erro claro, não confundir).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const convite = getConvite(slug);
  if (!convite) return { title: "Convite · PokerPi" };

  return {
    title: "Seu convite · PokerPi",
    description: "A nova edição do PokerPi está chegando. Garanta sua vaga.",
    openGraph: {
      title: "Seu convite · PokerPi",
      description: "A nova edição do PokerPi está chegando. Garanta sua vaga.",
      type: "website",
      url: `/convite/${slug}`,
    },
    // Convites são pessoais — não indexar nos buscadores.
    robots: { index: false, follow: false },
  };
}

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const convite = getConvite(slug);

  if (!convite) notFound();

  return (
    <>
      <ConviteOpenTracker slug={slug} />
      <Landing videoPublicId={convite.publicId} conviteSlug={slug} />
    </>
  );
}
