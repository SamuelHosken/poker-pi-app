import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/lib/types/database.types";

type Player = Tables<"players">;

export function QueueSection({ queue }: { queue: Player[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Fila de espera · {queue.length}
      </h2>

      {queue.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink-2 px-4 py-3 font-display text-sm italic text-gray-soft">
          Ninguém aguardando agora.
        </p>
      ) : (
        <ol className="space-y-1">
          {queue.map((p, idx) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm"
            >
              <span className="w-8 font-mono text-[10px] text-gray-mid">
                #{idx + 1}
              </span>
              <span className="flex-1 truncate text-paper">{p.name}</span>
              {p.nickname && (
                <span className="truncate font-display text-xs italic text-gold">
                  {p.nickname}
                </span>
              )}
              <span className="font-mono text-[10px] text-gray-soft">
                {formatDistanceToNow(new Date(p.created_at), {
                  locale: ptBR,
                  addSuffix: true,
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
