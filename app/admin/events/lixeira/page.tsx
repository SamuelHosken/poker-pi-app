import Link from "next/link";
import { listDeletedEvents } from "@/lib/tournament/events";
import { formatBRL, formatDateBR } from "@/lib/format";
import { TrashedEventRow } from "./trashed-event-row";
import { LiveRefresh } from "@/components/live-refresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStateLabel } from "@/lib/ui-labels";
import type { EventState } from "@/lib/types/domain";

export const metadata = { title: "Lixeira · Poker Pi" };

export default async function LixeiraPage() {
  const events = await listDeletedEvents();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={30000} />
      <Link
        href="/admin/events"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        ← Eventos
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive">
          Lixeira
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
          Eventos apagados
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          Restaurar volta o evento pra lista. Apagar definitivamente é
          irreversível — joga fora tudo (mesas, players, blinds, fichas, log).
        </p>
      </header>

      {events.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <p className="font-display text-lg italic text-muted-foreground">
              Lixeira vazia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg font-light sm:text-xl break-words">
                        {ev.name}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {formatDateBR(ev.event_date)} · {formatBRL(ev.buy_in_cents)}
                      </div>
                      {ev.deleted_at && (
                        <div className="mt-0.5 font-mono text-[10px] text-destructive/80">
                          Apagado em {formatDateBR(ev.deleted_at)}
                        </div>
                      )}
                    </div>
                    <Badge variant="gold">
                      {eventStateLabel(ev.state as EventState)}
                    </Badge>
                  </div>
                  <TrashedEventRow eventId={ev.id} eventName={ev.name} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
