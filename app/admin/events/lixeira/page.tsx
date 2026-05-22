import Link from "next/link";
import { listDeletedEvents } from "@/lib/tournament/events";
import { formatBRL, formatDateBR } from "@/lib/format";
import { TrashedEventRow } from "./trashed-event-row";

export const metadata = { title: "Lixeira · Poker Pi" };

const STATE_LABEL: Record<string, string> = {
  SETUP: "Setup",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

export default async function LixeiraPage() {
  const events = await listDeletedEvents();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <Link
        href="/admin/events"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Eventos
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
          Lixeira
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
          Eventos apagados
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          Restaurar volta o evento pra lista. Apagar definitivamente é
          irreversível — joga fora tudo (mesas, players, blinds, fichas, log).
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-lg border border-line bg-ink-2 px-6 py-12 text-center">
          <p className="font-display text-lg italic text-gray-soft">
            Lixeira vazia.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-lg border border-line bg-ink-2 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-light text-paper sm:text-xl break-words">
                    {ev.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-soft">
                    {formatDateBR(ev.event_date)} · {formatBRL(ev.buy_in_cents)}
                  </div>
                  {ev.deleted_at && (
                    <div className="mt-0.5 font-mono text-[10px] text-red-poker/80">
                      Apagado em {formatDateBR(ev.deleted_at)}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  {STATE_LABEL[ev.state] ?? ev.state}
                </span>
              </div>
              <div className="mt-4">
                <TrashedEventRow eventId={ev.id} eventName={ev.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
