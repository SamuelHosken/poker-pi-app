/**
 * "A noite" — os três atos da experiência (evergreen, sem data fixa) + uma
 * faixa de números. Reforça que é uma produção, não um joguinho de cozinha.
 */

const ACTS = [
  {
    n: "i.",
    title: "Recepção & jantar",
    body: "Chegada, ambientação e jantar. O briefing alinha as regras antes das cartas subirem.",
  },
  {
    n: "ii.",
    title: "O torneio",
    body: "Duas mesas em paralelo, blinds subindo no relógio, rebuy limitado. O vencedor de cada mesa vai pra final.",
  },
  {
    n: "iii.",
    title: "A final & o pódio",
    body: "A mesa final define o campeão da noite. Troféu, pódio e o encerramento que vira foto de perfil.",
  },
] as const;

const STATS = [
  { value: "30", label: "lugares por noite" },
  { value: "2", label: "mesas até a final" },
  { value: "1", label: "campeão da noite" },
] as const;

export function Night() {
  return (
    <section className="border-y border-hair bg-ink-2/40 px-6 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            A noite
          </span>
          <h2 className="mt-4 font-display text-[clamp(32px,5.5vw,60px)] font-light leading-[1.02] tracking-tight text-paper">
            Três atos, uma <em className="not-italic italic text-gold">final</em>
            <span className="text-red-poker">.</span>
          </h2>
        </header>

        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {ACTS.map((a) => (
            <li
              key={a.n}
              className="flex flex-col gap-4 rounded-2xl border border-hair bg-surface p-7 sm:p-8"
            >
              <span className="font-display text-4xl font-light italic text-gold">
                {a.n}
              </span>
              <h3 className="font-display text-2xl font-light tracking-tight text-paper">
                {a.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-soft">{a.body}</p>
            </li>
          ))}
        </ol>

        {/* Faixa de números */}
        <div className="mt-16 grid grid-cols-3 gap-4 border-t border-hair pt-12">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[clamp(40px,8vw,84px)] font-light leading-none tabular-nums text-gold">
                {s.value}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-mid sm:text-[11px]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
