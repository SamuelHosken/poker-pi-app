"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setAutoAdvanceBlinds } from "@/lib/tournament/events";

/**
 * V1.3 — Toggle "Avanço de blinds: Manual / Automático".
 *
 * Manual (padrão): cronômetro fica negativo quando expira; admin clica
 * "Próximo nível" pra avançar.
 *
 * Automático: quando o cronômetro chega a 0, o MesaLiveControl chama
 * advanceLevel sozinho após 2s. Funciona enquanto o admin tiver a página
 * de TV config aberta.
 */
export function AutoAdvanceToggle({
  eventId,
  enabled,
}: {
  eventId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle(next: boolean) {
    startTransition(async () => {
      try {
        await setAutoAdvanceBlinds({ eventId, enabled: next });
        toast.success(
          next ? "Blinds passam automático agora" : "Voltou pra manual",
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hair bg-surface p-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Avanço de blinds
      </span>
      <div className="ml-auto inline-flex gap-1 rounded-lg border border-hair bg-surface p-0.5">
        <Button
          type="button"
          variant={!enabled ? "default" : "ghost"}
          size="sm"
          onClick={() => handle(false)}
          disabled={pending || !enabled}
          style={{ touchAction: "manipulation", minHeight: "44px" }}
          className="gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          <Hand className="size-3.5" aria-hidden />
          Manual
        </Button>
        <Button
          type="button"
          variant={enabled ? "default" : "ghost"}
          size="sm"
          onClick={() => handle(true)}
          disabled={pending || enabled}
          style={{ touchAction: "manipulation", minHeight: "44px" }}
          className="gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          <Bot className="size-3.5" aria-hidden />
          Automático
        </Button>
      </div>
    </div>
  );
}
