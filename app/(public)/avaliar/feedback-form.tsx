"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, PartyPopper } from "lucide-react";
import { submitFeedback, type FeedbackInput } from "./actions";

type RatingKey =
  | "ratingOrganizacao"
  | "ratingTorneio"
  | "ratingJantar"
  | "ratingBar"
  | "ratingEstrutura";

const QUESTIONS: { key: RatingKey; n: number; label: string; hint: string }[] = [
  { key: "ratingOrganizacao", n: 1, label: "A organização do evento", hint: "Recepção, fluidez, comunicação." },
  { key: "ratingTorneio", n: 2, label: "O torneio", hint: "Estrutura de jogo, ritmo, premiação." },
  { key: "ratingJantar", n: 3, label: "O jantar", hint: "Comida e bebida que rolou na mesa." },
  { key: "ratingBar", n: 4, label: "O bar", hint: "Drinks, variedade e atendimento." },
  { key: "ratingEstrutura", n: 5, label: "A estrutura do evento", hint: "Espaço, mesas, ambiente, som." },
];

function valueLabel(v: number | null): string {
  if (v == null) return "Toque numa nota de 0 a 10";
  if (v <= 2) return "Muito ruim";
  if (v <= 4) return "Ruim";
  if (v <= 6) return "Na média";
  if (v <= 8) return "Bom";
  return "Excelente";
}

/** Tom da nota selecionada: vermelho (baixo) → dourado (médio) → verde-feltro (alto). */
function tierClasses(v: number): string {
  if (v <= 4) return "bg-red-poker text-paper border-red-poker";
  if (v <= 7) return "bg-gold text-ink border-gold";
  return "bg-felt text-paper border-felt";
}

function RatingScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-[5px]">
        {Array.from({ length: 11 }, (_, i) => i).map((i) => {
          const selected = value === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              aria-pressed={selected}
              aria-label={`Nota ${i}`}
              style={{ touchAction: "manipulation" }}
              className={[
                "flex h-11 items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-all duration-150 active:scale-95",
                selected
                  ? `${tierClasses(i)} scale-[1.06] shadow-[0_4px_14px_rgba(0,0,0,0.4)]`
                  : "border-line bg-ink-2 text-gray-soft hover:border-gold/50 hover:text-paper",
              ].join(" ")}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        <span>0 · Péssimo</span>
        <span
          className={
            value == null ? "text-gray-mid" : "text-paper"
          }
        >
          {valueLabel(value)}
        </span>
        <span>10 · Top</span>
      </div>
    </div>
  );
}

export function FeedbackForm() {
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});
  const [suggestion, setSuggestion] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answered = QUESTIONS.filter((q) => ratings[q.key] != null).length;
  const allAnswered = answered === QUESTIONS.length;

  function setRating(key: RatingKey, v: number) {
    setError(null);
    setRatings((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit() {
    if (!allAnswered) {
      setError("Responda as 5 notas antes de enviar.");
      return;
    }
    setError(null);
    const payload: FeedbackInput = {
      ratingOrganizacao: ratings.ratingOrganizacao!,
      ratingTorneio: ratings.ratingTorneio!,
      ratingJantar: ratings.ratingJantar!,
      ratingBar: ratings.ratingBar!,
      ratingEstrutura: ratings.ratingEstrutura!,
      suggestion: suggestion.trim() || undefined,
    };
    startTransition(async () => {
      const res = await submitFeedback(payload);
      if (res.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-gold/30 bg-ink-2 px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h2 className="font-display text-3xl font-light tracking-tight text-paper">
          Valeu demais!
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-gray-soft">
          Sua avaliação foi registrada. Ela ajuda a deixar o próximo{" "}
          <span className="text-gold">PokerPi</span> ainda melhor. Até a próxima
          mesa. ♠
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {QUESTIONS.map((q) => (
        <div
          key={q.key}
          className="rounded-2xl border border-line bg-ink-2/60 p-5"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 font-mono text-[11px] text-gold">
              {q.n}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-medium leading-snug text-paper">
                {q.label}
              </h3>
              <p className="mt-0.5 text-xs text-gray-mid">{q.hint}</p>
            </div>
          </div>
          <RatingScale
            value={ratings[q.key] ?? null}
            onChange={(v) => setRating(q.key, v)}
          />
        </div>
      ))}

      {/* Pergunta 6 — aberta */}
      <div className="rounded-2xl border border-line bg-ink-2/60 p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 font-mono text-[11px] text-gold">
            6
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-medium leading-snug text-paper">
              O que você gostaria de ver no próximo PokerPi?
            </h3>
            <p className="mt-0.5 text-xs text-gray-mid">
              Ideias, sugestões, o que faltou. (opcional)
            </p>
          </div>
        </div>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Pode mandar tudo aqui…"
          className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-sm text-paper placeholder:text-gray-mid focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
      </div>

      {error && (
        <p className="text-center text-sm text-red-poker">{error}</p>
      )}

      {/* Rodapé de envio */}
      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {QUESTIONS.map((q) => (
            <span
              key={q.key}
              className={[
                "h-1.5 w-6 rounded-full transition-colors",
                ratings[q.key] != null ? "bg-gold" : "bg-line",
              ].join(" ")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !allAnswered}
          style={{ touchAction: "manipulation" }}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gold px-6 font-mono text-xs uppercase tracking-[0.18em] text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : allAnswered ? (
            <>
              <Check className="h-4 w-4" />
              Enviar avaliação
            </>
          ) : (
            `Faltam ${QUESTIONS.length - answered} nota${
              QUESTIONS.length - answered > 1 ? "s" : ""
            }`
          )}
        </button>
      </div>
    </div>
  );
}
