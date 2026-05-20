import Link from "next/link";
import { listEvents } from "@/lib/tournament/events";
import { formatBRL, formatDateBR } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";

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
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Eventos
          </span>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight text-paper">
            Seus torneios
          </h1>
        </div>
        <Link
          href="/admin/events/new"
          className={buttonVariants({ className: "h-12 bg-gold text-ink hover:bg-gold/90" })}
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
                className="flex items-center justify-between rounded-lg border border-line bg-ink-2 px-5 py-4 transition-colors hover:border-gold/50 hover:bg-smoke"
              >
                <div>
                  <div className="font-display text-xl font-light text-paper">{ev.name}</div>
                  <div className="mt-1 font-mono text-xs text-gray-soft">
                    {formatDateBR(ev.event_date)} · {formatBRL(ev.buy_in_cents)}
                  </div>
                </div>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  {STATE_LABEL[ev.state] ?? ev.state}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
