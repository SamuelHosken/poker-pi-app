import Image from "next/image";
import { Reveal } from "./reveal";
import { Grain } from "./grain";

/**
 * Faixa "1ª edição": frames reais do nosso vídeo (footage da 1ª edição).
 * Quando chegarem fotos profissionais, é só trocar /event/gallery-N.jpg.
 */
const PHOTOS = [1, 2, 3, 4];

export function GalleryStrip() {
  return (
    <section className="relative bg-ink-warm py-20 lg:py-28">
      <Grain opacity={0.06} />
      <Reveal className="relative z-[2] mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">A 1ª edição</p>
        <h2 className="mt-3 max-w-2xl font-condensed text-[clamp(34px,7.5vw,76px)] font-extrabold uppercase leading-[0.88] text-cream">
          Já rolou uma vez. Agora vem a melhor.
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PHOTOS.map((n) => (
            <div key={n} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src={`/event/gallery-${n}.jpg`}
                alt="Poker Pi · 1ª edição"
                fill
                sizes="(max-width: 640px) 45vw, 22vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
