"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hourglass, X } from "lucide-react";
import { setTvStartsAt } from "@/lib/tournament/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * V1.3 — Admin define um horário-alvo de início. TV mostra overlay
 * "Vamos começar jajá — HH:MM" com countdown ao vivo.
 *
 * Pré-sets rápidos: 15min, 30min, 1h (a partir de agora). Também aceita
 * input <time> pra ajuste manual.
 */
export function TvStartControl({
  eventId,
  currentStartsAt,
}: {
  eventId: string;
  currentStartsAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // input type="time" usa "HH:MM" 24h
  const [timeStr, setTimeStr] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // default: +30min
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const isActive = currentStartsAt !== null;
  const activeDate = currentStartsAt ? new Date(currentStartsAt) : null;

  function activate(date: Date) {
    startTransition(async () => {
      try {
        await setTvStartsAt({ eventId, startsAt: date });
        toast.success("Modo início ativado");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function deactivate() {
    startTransition(async () => {
      try {
        await setTvStartsAt({ eventId, startsAt: null });
        toast.success("Modo início desligado");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handlePreset(minutesFromNow: number) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesFromNow);
    activate(d);
  }

  function handleManual() {
    // Parse "HH:MM" pra hoje no fuso local
    const parts = timeStr.split(":").map((n) => parseInt(n, 10));
    const hh = parts[0];
    const mm = parts[1];
    if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) {
      toast.error("Horário inválido");
      return;
    }
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    // Se a hora escolhida já passou hoje, joga pra amanhã
    if (d.getTime() < Date.now()) {
      d.setDate(d.getDate() + 1);
    }
    activate(d);
  }

  if (isActive && activeDate) {
    return (
      <Card className="border-gold/40 bg-gold/5">
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <Hourglass className="size-4 shrink-0 text-gold" aria-hidden />
          <span className="flex-1 truncate font-mono text-[11px] text-gold">
            Modo início ativo · começa{" "}
            {activeDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={deactivate}
            disabled={pending}
            style={{ touchAction: "manipulation" }}
          >
            <X className="size-3.5" aria-hidden />
            Desligar
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
        <Hourglass className="size-4" aria-hidden />
        Modo &ldquo;Vamos começar jajá&rdquo;
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
                  Vamos começar jajá
                </span>
                <p className="font-display text-xl font-light text-paper">
                  Cobre a TV com countdown ao vivo
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Mostra o nome do evento + horário-alvo + tempo restante.
                  Esquenta os jogadores antes de começar.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  Atalhos
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "+15 min", value: 15 },
                    { label: "+30 min", value: 30 },
                    { label: "+1 hora", value: 60 },
                  ].map((p) => (
                    <Button
                      key={p.value}
                      variant="outline"
                      size="default"
                      onClick={() => handlePreset(p.value)}
                      disabled={pending}
                      className="font-mono text-[11px] uppercase tracking-[0.18em]"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  Horário específico (hoje)
                </span>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="h-12 flex-1 rounded-xl border border-hair bg-surface px-3 text-sm text-foreground focus:border-gold focus:outline-none"
                  />
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleManual}
                    disabled={pending}
                  >
                    {pending ? "Ativando…" : "Ativar"}
                  </Button>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Se o horário já passou hoje, vai pra amanhã.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
