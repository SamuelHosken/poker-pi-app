"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
    <li className="flex items-center gap-3 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm">
      <span className="flex-1 truncate text-paper">
        {player.name}
        {player.nickname && (
          <span className="ml-2 font-display text-xs italic text-gold">
            {player.nickname}
          </span>
        )}
      </span>

      <span className="font-mono text-[10px] text-gray-soft">
        Rebuys {player.rebuys_used}/{rebuyLimit}
      </span>

      {lastLevelNumber != null && (
        <span className="font-mono text-[10px] text-gray-mid">
          Nível {lastLevelNumber}
        </span>
      )}

      {eligibility.eligible ? (
        <button
          type="button"
          onClick={handleRebuy}
          disabled={pending}
          className="rounded-md border border-gold/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {pending ? "Aplicando…" : "Fazer rebuy"}
        </button>
      ) : (
        <span
          title={eligibility.reason}
          className="rounded-md border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid cursor-help"
        >
          Inelegível
        </span>
      )}
    </li>
  );
}
