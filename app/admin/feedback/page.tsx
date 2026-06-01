import { getAllFeedback } from "@/lib/tournament/feedback";
import { formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { CopyLinkButton } from "./copy-link-button";
import { ResetFeedbackButton } from "./reset-feedback-button";

export const metadata = {
  title: "Avaliações · Poker Pi",
};

function scoreColor(v: number | null): string {
  if (v == null) return "text-gray-mid";
  if (v <= 4) return "text-red-poker";
  if (v <= 7) return "text-gold";
  return "text-felt";
}

const CATEGORIES: {
  key: keyof Awaited<ReturnType<typeof getAllFeedback>>["averages"];
  label: string;
}[] = [
  { key: "organizacao", label: "Organização" },
  { key: "torneio", label: "Torneio" },
  { key: "jantar", label: "Jantar" },
  { key: "bar", label: "Bar" },
  { key: "estrutura", label: "Estrutura" },
];

// Categorias na linha crua (uma avaliação individual).
const ROW_CATS: {
  key:
    | "rating_organizacao"
    | "rating_torneio"
    | "rating_jantar"
    | "rating_bar"
    | "rating_estrutura";
  label: string;
}[] = [
  { key: "rating_organizacao", label: "Org" },
  { key: "rating_torneio", label: "Torneio" },
  { key: "rating_jantar", label: "Jantar" },
  { key: "rating_bar", label: "Bar" },
  { key: "rating_estrutura", label: "Estrutura" },
];

export default async function FeedbackPage() {
  const summary = await getAllFeedback();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={15000} />

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Avaliações do PokerPi
        </span>
        <h1 className="break-words font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl">
          O que a galera achou
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          {summary.count === 0
            ? "nenhuma resposta ainda"
            : `${summary.count} resposta${summary.count === 1 ? "" : "s"}`}
        </p>
      </header>

      <CopyLinkButton />

      {summary.count === 0 ? (
        <div className="rounded-2xl border border-line bg-ink-2 px-6 py-12 text-center">
          <p className="text-sm text-gray-soft">
            Ainda não chegou nenhuma avaliação. Compartilhe o link acima com a
            galera que foi no poker.
          </p>
        </div>
      ) : (
        <>
          {/* Nota geral + médias por categoria */}
          <section className="rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
            <div className="flex items-center gap-5 border-b border-line pb-5">
              <div
                className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-line bg-ink ${scoreColor(
                  summary.averages.geral,
                )}`}
              >
                <span className="font-display text-3xl font-light tabular-nums">
                  {summary.averages.geral ?? "—"}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-mid">
                  geral
                </span>
              </div>
              <div>
                <p className="font-display text-lg text-paper">Nota média geral</p>
                <p className="text-xs text-gray-soft">
                  Média de todas as notas, de 0 a 10.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {CATEGORIES.map((c) => {
                const v = summary.averages[c.key];
                return (
                  <div
                    key={c.key}
                    className="rounded-xl border border-line bg-ink p-3 text-center"
                  >
                    <span
                      className={`block font-display text-2xl font-light tabular-nums ${scoreColor(
                        v,
                      )}`}
                    >
                      {v ?? "—"}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-gray-mid">
                      {c.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Respostas individuais — cada avaliação, por pessoa */}
          <section className="space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
              Respostas individuais ({summary.count})
            </h2>
            <ul className="space-y-2">
              {summary.responses.map((r, i) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-line bg-ink-2 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                      Pessoa #{summary.count - i}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-mid">
                      {formatDateBR(r.created_at, "dd/MM 'às' HH:mm")}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {ROW_CATS.map((c) => (
                      <div
                        key={c.key}
                        className="rounded-lg border border-line bg-ink p-2 text-center"
                      >
                        <span
                          className={`block font-display text-lg font-light tabular-nums ${scoreColor(
                            r[c.key],
                          )}`}
                        >
                          {r[c.key]}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-gray-mid">
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {r.suggestion && r.suggestion.trim().length > 0 && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-ink p-3 text-sm leading-relaxed text-paper">
                      {r.suggestion}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex justify-end border-t border-line pt-6">
            <ResetFeedbackButton count={summary.count} />
          </div>
        </>
      )}
    </main>
  );
}
