const ITEMS = [
  { n: "01", t: "Chegada", d: "Comidas pra beliscar, ambiente top e o bar aberto desde o primeiro aperto de mão." },
  { n: "02", t: "Início do torneio", d: "Três mesas rodando ao mesmo tempo. Fichas, blinds que sobem e cronômetro. Aqui se joga pra valer." },
  { n: "03", t: "Jantar", d: "Uma pausa no torneio pra um jantar de alta qualidade, comida boa de verdade pra segurar a noite." },
  { n: "04", t: "A Final", d: "A última mesa, onde se decide o campeão do torneio." },
];

import { Reveal } from "./reveal";
import { BlurWord } from "./blur-word";
import { FlickerText } from "./flicker-text";

/** Dobra clara (creme) no meio da página dark. */
export function TheNight() {
  return (
    <section className="bg-cream text-ink-warm">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <p className="font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand">
            <FlickerText>A noite</FlickerText>
          </p>
          <h2 className="mt-3 max-w-3xl font-condensed text-[clamp(34px,7.5vw,76px)] font-extrabold uppercase leading-[0.96] text-ink-warm">
            Não é sobre <BlurWord amount={0.6}>sorte.</BlurWord> É sobre quem fica até o{" "}
            <BlurWord>fim.</BlurWord>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((i, idx) => (
            <Reveal
              key={i.n}
              delay={idx * 0.1}
              className="rounded-2xl border border-cream-3 bg-cream-2 p-7"
            >
              <div className="font-condensed text-5xl font-extrabold leading-none text-red-brand">{i.n}</div>
              <h3 className="mt-4 font-condensed text-3xl font-bold uppercase leading-none text-ink-warm">{i.t}</h3>
              <p className="mt-3 text-base leading-relaxed text-ink-warm-soft">{i.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
