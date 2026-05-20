import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Poker Pi
        </span>
        <h1 className="font-display text-[clamp(64px,12vw,128px)] font-light leading-[0.9] tracking-tight text-paper">
          Poker <em className="not-italic italic text-gold">Pi</em>
          <span className="text-red-poker">.</span>
        </h1>
        <p className="max-w-md font-display text-lg font-light italic leading-relaxed text-gray-soft">
          Sistema de gestão de torneio de poker presencial.
        </p>
      </div>

      <Link
        href="/admin/login"
        className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-ink-2 px-7 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-colors hover:border-gold hover:text-gold"
      >
        Entrar no painel
      </Link>

      <div className="mt-8 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
        <span aria-hidden className="h-px w-8 bg-line" />
        Etapa 0 · Setup
        <span aria-hidden className="h-px w-8 bg-line" />
      </div>
    </main>
  );
}
