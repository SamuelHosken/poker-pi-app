import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Experience } from "@/components/home/experience";
import { Night } from "@/components/home/night";
import { Join } from "@/components/home/join";
import { SiteFooter } from "@/components/home/site-footer";
import { HOME } from "@/components/home/content";

export const metadata: Metadata = {
  title: "Poker Pi",
  description: HOME.description,
  openGraph: {
    title: "Poker Pi — O poker é matemática. O resto é narrativa.",
    description: HOME.description,
    type: "website",
    url: "/",
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Experience />
      <Night />
      <Join />
      <SiteFooter />
    </>
  );
}
