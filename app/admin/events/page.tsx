import Link from "next/link";
import { listEvents } from "@/lib/tournament/events";
import { formatBRL, formatDateBR } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = {
  title: "Eventos · Poker Pi",
};

const STATE_LABEL: Record<string, string> = {
  SETUP: "Setup",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

export default async function EventsListPage() {
  const events = await listEvents();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={10000} />
      <header className="space-y-4 sm:flex sm:items-end sm:justify-between sm:space-y-0">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Eventos
          </span>
          <h1 className="mt-1 font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
            Seus torneios
          </h1>
        </div>
        <Link
          href="/admin/events/new"
          className={buttonVariants({
            className: "h-12 w-full bg-gold text-ink hover:bg-gold/90 sm:w-auto",
          })}
        >
          + Criar evento
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="rounded-lg border border-line bg-ink-2 px-6 py-12 text-center">
          <p className="font-display text-lg italic text-gray-soft">
            Nenhum evento ainda. Crie o primeiro torneio para começar.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/admin/events/${ev.id}`}
                className="block rounded-lg border border-line bg-ink-2 p-4 transition-colors hover:border-gold/50 hover:bg-smoke sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-light text-paper sm:text-xl break-words">
                      {ev.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-gray-soft">
                      {formatDateBR(ev.event_date)}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-gray-soft">
                      {formatBRL(ev.buy_in_cents)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {STATE_LABEL[ev.state] ?? ev.state}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
