"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coffee, X } from "lucide-react";
import { setTvPausedMessage } from "@/lib/tournament/events";

const PRESETS = ["Já voltamos", "Intervalo de 10 minutos", "Pausa", "Volta em 5"];

export function TvPauseControl({
  eventId,
  currentMessage,
}: {
  eventId: string;
  currentMessage: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(currentMessage ?? "Já voltamos");
  const [pending, startTransition] = useTransition();

  const isActive = currentMessage !== null && currentMessage.trim().length > 0;

  function handleActivate(msg: string) {
    startTransition(async () => {
      try {
        await setTvPausedMessage({ eventId, message: msg });
        toast.success("Pausa geral ativada");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleDeactivate() {
    startTransition(async () => {
      try {
        await setTvPausedMessage({ eventId, message: null });
        toast.success("TV retomada");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  if (isActive) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2">
        <Coffee className="size-4 shrink-0 text-gold" aria-hidden />
        <span className="flex-1 truncate font-mono text-[11px] text-gold">
          TV em pausa: &ldquo;{currentMessage}&rdquo;
        </span>
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gold px-3 text-xs font-medium text-ink hover:bg-gold/90 disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden />
          Retomar TV
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        style={{ touchAction: "manipulation" }}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-ink-2 px-4 text-sm text-gray-soft transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
      >
        <Coffee className="size-4" aria-hidden />
        Pausa geral
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-gold/30 bg-ink-2 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                Pausa geral da TV
              </span>
              <p className="font-display text-xl font-light text-paper">
                Cobre a TV com mensagem grande
              </p>
              <p className="font-mono text-[11px] text-gray-soft">
                Útil pro intervalo. Mesas continuam rodando — só esconde da TV.
              </p>
            </div>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensagem (ex.: Já voltamos)"
              className="h-12 w-full rounded-md border border-line bg-ink px-3 text-sm text-paper focus:border-gold focus:outline-none"
              autoFocus
            />

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMessage(p)}
                  className="rounded-md border border-line bg-ink px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft transition-colors hover:border-gold/40 hover:text-gold"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center rounded-md border border-line px-4 text-sm text-gray-soft hover:text-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleActivate(message)}
                disabled={pending || !message.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold/90 disabled:opacity-50"
              >
                {pending ? "Ativando…" : "Ativar pausa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
