/**
 * "O que é o Poker Pi" — a experiência. Conta que é mais que um jogo: é a noite,
 * a mesa, a roda. Quatro pilares em cards de vidro.
 */

const PILLARS = [
  {
    tag: "A mesa",
    title: "Um torneio de verdade",
    body: "Fichas e cartas reais, blinds subindo, cronômetro no telão. Duas mesas rodando em paralelo até a mesa final.",
  },
  {
    tag: "À mesa",
    title: "Jantar e open bar",
    body: "Jantar completo e bar liberado pra quem quiser. Ninguém aqui joga de barriga vazia.",
  },
  {
    tag: "A roda",
    title: "As pessoas certas",
    body: "Trinta lugares por noite. O tipo de sala em que vale a pena estar — e ficar até o fim.",
  },
  {
    tag: "O espetáculo",
    title: "A noite vira história",
    body: "TV ao vivo sincronizada, eliminações em tempo real e um pódio no final. No dia seguinte, todo mundo ainda fala da noite.",
  },
] as const;

export function Experience() {
  return (
    <section className="bg-ink px-5 py-20 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            A experiência
          </span>
          <h2 className="mt-4 font-display text-[clamp(32px,5.5vw,60px)] font-light leading-[1.02] tracking-tight text-paper">
            Antes de tudo,
            <br />
            um <em className="not-italic italic text-gold">rolê</em>
            <span className="text-red-poker">.</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-gray-soft sm:text-lg">
            O torneio dá o ritmo da noite — mas ninguém vai embora falando só do
            all-in. Vai falar do jantar, da última rodada do bar e da gargalhada
            da mesa do lado. O Poker Pi é o encontro; o poker é a desculpa
            perfeita.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-4">
          {PILLARS.map((p) => (
            <article
              key={p.tag}
              className="glass flex flex-col gap-3 rounded-2xl p-7 sm:p-8"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold">
                {p.tag}
              </span>
              <h3 className="font-display text-2xl font-light tracking-tight text-paper">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-soft">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
