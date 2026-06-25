const ITEMS = [
  { n: "01", t: "Jantar", d: "Comida boa a noite inteira, do primeiro flop ao heads-up final." },
  { n: "02", t: "Bar", d: "Bebida pra todo mundo. E Open Bar liberado pra quem escolhe o plano completo." },
  { n: "03", t: "Torneio de verdade", d: "Fichas, blinds que sobem, mesa final e cronômetro. Aqui se joga pra valer." },
];

import { Reveal } from "./reveal";

/** Dobra clara (creme) no meio da página dark. */
export function TheNight() {
  return (
    <section className="bg-cream text-ink-warm">
      <Reveal className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">A noite</p>
        <h2 className="mt-3 max-w-3xl font-condensed text-[clamp(34px,7.5vw,76px)] font-extrabold uppercase leading-[0.96] text-ink-warm">
          Não é sobre sorte. É sobre quem fica até o fim.
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {ITEMS.map((i) => (
            <div key={i.n} className="rounded-2xl border border-cream-3 bg-cream-2 p-7">
              <div className="font-condensed text-5xl font-extrabold leading-none text-red-brand">{i.n}</div>
              <h3 className="mt-4 font-condensed text-3xl font-bold uppercase leading-none text-ink-warm">{i.t}</h3>
              <p className="mt-3 text-base leading-relaxed text-ink-warm-soft">{i.d}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
