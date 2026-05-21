import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/tournament/profiles";
import { getMyEvents } from "@/lib/tournament/player-actions";
import { formatDateBR } from "@/lib/format";
import { LogoutMeButton } from "./logout-me-button";
import { TableActions } from "./table-actions";

export const metadata = {
  title: "Sua sessão · Poker Pi",
};

const EVENT_STATE_LABEL: Record<string, string> = {
  SETUP: "Em setup",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

const TABLE_STATE_LABEL: Record<string, string> = {
  LIVRE: "Livre",
  JOGANDO: "Jogando",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
};

export default async function MePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/admin/login");

  const myEvents = await getMyEvents();

  // Se for admin, oferece atalho pro painel
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-6 py-10">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Poker Pi
          </span>
          <h1 className="mt-1 font-display text-3xl font-light tracking-tight text-paper">
            Olá, {profile.name}
          </h1>
          {profile.nickname && (
            <p className="font-display text-base italic text-gold">{profile.nickname}</p>
          )}
        </div>
        <LogoutMeButton />
      </header>

      {profile.is_admin && (
        <p className="mt-6 rounded-md border border-gold/30 bg-ink-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Você é admin. Ir pro painel:{" "}
          <Link href="/admin/events" className="underline-offset-4 hover:underline">
            /admin/events
          </Link>
        </p>
      )}

      <section className="mt-10 space-y-5 flex-1">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Seus eventos
        </h2>

        {myEvents.length === 0 ? (
          <div className="rounded-lg border border-line bg-ink-2 px-6 py-12 text-center">
            <p className="font-display text-lg italic text-gray-soft">
              Você ainda não foi adicionado a nenhum evento.
            </p>
            <p className="mt-2 text-sm text-gray-mid">
              Peça pro admin te incluir.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {myEvents.map((ev) => {
              const isActive = ev.event.state === "EM_ANDAMENTO";
              const inSomeTable = ev.myMatchTableId !== null;

              return (
                <li
                  key={ev.event.id}
                  className="rounded-lg border border-line bg-ink-2 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl font-light text-paper">
                        {ev.event.name}
                      </div>
                      <div className="mt-1 font-mono text-xs text-gray-soft">
                        {formatDateBR(ev.event.event_date)} ·{" "}
                        <span className="text-gold">
                          {EVENT_STATE_LABEL[ev.event.state] ?? ev.event.state}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                      Você: {ev.player.state}
                    </div>
                  </div>

                  {isActive ? (
                    <div className="space-y-2 border-t border-line pt-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                        Mesas disponíveis
                      </p>
                      <ul className="grid grid-cols-2 gap-2">
                        {ev.tables.map((t) => {
                          const youAreHere = ev.myMatchTableId === t.id;
                          const isBusyElsewhere =
                            inSomeTable && !youAreHere;
                          const isFinalized = t.state === "FINALIZADA";

                          return (
                            <li
                              key={t.id}
                              className={`rounded-md border p-3 ${
                                youAreHere
                                  ? "border-gold/60 bg-gold/5"
                                  : "border-line bg-ink"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-display text-lg text-paper">
                                  Mesa {t.table_number}
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                                  {TABLE_STATE_LABEL[t.state] ?? t.state}
                                </span>
                              </div>
                              <div className="mt-2">
                                <TableActions
                                  physicalTableId={t.id}
                                  youAreHere={youAreHere}
                                  isBusyElsewhere={isBusyElsewhere}
                                  isFinalized={isFinalized}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
                      {ev.event.state === "ENCERRADO"
                        ? "Evento encerrado"
                        : "Evento ainda não começou"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
