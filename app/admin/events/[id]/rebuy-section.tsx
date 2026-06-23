"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { performRebuy } from "@/lib/tournament/rebuy";
import type { EliminatedWithStatus } from "@/lib/tournament/rebuy";

export function RebuySection({
  eliminated,
  rebuyLimit,
}: {
  eliminated: EliminatedWithStatus[];
  rebuyLimit: number;
}) {
  if (eliminated.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Eliminados · {eliminated.length}
      </h2>

      <ul className="space-y-1">
        {eliminated.map((item) => (
          <RebuyRow key={item.player.id} item={item} rebuyLimit={rebuyLimit} />
        ))}
      </ul>
    </section>
  );
}

function RebuyRow({
  item,
  rebuyLimit,
}: {
  item: EliminatedWithStatus;
  rebuyLimit: number;
}) {
  const [pending, startTransition] = useTransition();
  const { player, eligibility, lastLevelNumber } = item;

  function handleRebuy() {
    startTransition(async () => {
      try {
        await performRebuy(player.id);
        toast.success(`${player.name} voltou pra fila`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-hair bg-surface px-3 py-2.5 text-sm">
      <span className="min-w-0 flex-1 truncate text-paper">
        {player.name}
        {player.nickname && (
          <span className="ml-2 font-display text-xs italic text-gold">
            {player.nickname}
          </span>
        )}
      </span>

      <span className="font-mono text-[10px] text-muted-foreground">
        Rebuys {player.rebuys_used}/{rebuyLimit}
      </span>

      {lastLevelNumber != null && (
        <span className="font-mono text-[10px] text-muted-foreground">
          Nível {lastLevelNumber}
        </span>
      )}

      {eligibility.eligible ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRebuy}
          disabled={pending}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold"
        >
          {pending ? "Aplicando…" : "Fazer rebuy"}
        </Button>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {eligibility.reason ?? "Inelegível"}
        </span>
      )}
    </li>
  );
}
