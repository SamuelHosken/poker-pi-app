import Image from "next/image";
import { Reveal } from "./reveal";
import { BlurWord } from "./blur-word";

/**
 * Faixa "1ª edição": mosaico editorial das fotos reais do dia.
 * `span` define o tamanho de cada foto no grid (grandes + pequenas).
 * Fotos 5 e 6 são paisagem (ficam largas); o resto retrato.
 */
const PHOTOS: { n: number; span: string }[] = [
  { n: 1, span: "col-span-2 row-span-2" },
  { n: 5, span: "col-span-2" },
  { n: 2, span: "" },
  { n: 3, span: "" },
  { n: 6, span: "col-span-2" },
  { n: 4, span: "row-span-2" },
  { n: 7, span: "" },
  { n: 8, span: "" },
];

export function GalleryStrip() {
  return (
    <section className="relative bg-ink-warm py-20 lg:py-28">
      <Reveal className="relative z-[2] mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">A 1ª edição</p>
        <h2 className="mt-3 max-w-2xl font-condensed text-[clamp(34px,7.5vw,76px)] font-extrabold uppercase leading-[0.96] text-cream">
          Já rolou uma vez. Agora vem a <BlurWord>melhor.</BlurWord>
        </h2>

        <div className="mt-12 grid auto-rows-[42vw] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[200px] sm:grid-cols-4">
          {PHOTOS.map(({ n, span }) => (
            <div key={n} className={`relative overflow-hidden rounded-2xl ${span}`}>
              <Image
                src={`/event/photo-${n}.jpg`}
                alt="Poker Pi · 1ª edição"
                fill
                sizes="(max-width: 640px) 90vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
