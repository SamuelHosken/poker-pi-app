"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coffee, X } from "lucide-react";
import { setTvPausedMessage } from "@/lib/tournament/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card className="border-gold/40 bg-gold/5">
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <Coffee className="size-4 shrink-0 text-gold" aria-hidden />
          <span className="flex-1 truncate font-mono text-[11px] text-gold">
            TV em pausa: &ldquo;{currentMessage}&rdquo;
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={handleDeactivate}
            disabled={pending}
            style={{ touchAction: "manipulation" }}
          >
            <X className="size-3.5" aria-hidden />
            Retomar TV
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        size="default"
        onClick={() => setOpen(true)}
        disabled={pending}
        style={{ touchAction: "manipulation" }}
      >
        <Coffee className="size-4" aria-hidden />
        Pausa geral
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <Card
            className="w-full max-w-md border-gold/30"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="space-y-4 py-5">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                  Pausa geral da TV
                </span>
                <p className="font-display text-xl font-light text-paper">
                  Cobre a TV com mensagem grande
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Útil pro intervalo. Mesas continuam rodando — só esconde da TV.
                </p>
              </div>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensagem (ex.: Já voltamos)"
                className="h-12 w-full rounded-xl border border-hair bg-surface px-3 text-sm text-foreground focus:border-gold focus:outline-none"
                autoFocus
              />

              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="xs"
                    onClick={() => setMessage(p)}
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  >
                    {p}
                  </Button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="default"
                  onClick={() => handleActivate(message)}
                  disabled={pending || !message.trim()}
                >
                  {pending ? "Ativando…" : "Ativar pausa"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
