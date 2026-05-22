import Link from "next/link";
import { getMyProfile } from "@/lib/tournament/profiles";
import { AvatarImage } from "@/components/ui/avatar-image";
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
  // Profile + events em paralelo.
  const [profile, myEvents] = await Promise.all([getMyProfile(), getMyEvents()]);

  // V1.3: admin também pode jogar — não redireciona mais pra /admin/events.
  // Admin que quer voltar pro painel tem link no header.

  // V1.2 fix anti-loop: se sessão tá em limbo (cookie válido mas profile null),
  // não redirecionamos — mostramos uma página de "sessão inválida" com botão de
  // logout. Evita loop redirect com /admin/login.
  if (!profile) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-ink px-4 py-8 text-center text-paper sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
          Sessão inválida
        </span>
        <h1 className="max-w-md font-display text-2xl font-light tracking-tight sm:text-3xl">
          Não conseguimos identificar seu perfil.
        </h1>
        <p className="max-w-md text-sm text-gray-soft">
          Sua sessão está em estado inconsistente (cookie válido mas perfil
          não encontrado). Faça logout e login novamente.
        </p>
        <LogoutMeButton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      {profile.is_admin && (
        <Link
          href="/admin/events"
          prefetch
          className="mb-4 inline-flex h-9 w-fit items-center gap-2 rounded-md border border-gold/30 bg-gold/5 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10"
        >
          ← Painel admin
        </Link>
      )}
      <header className="flex items-start justify-between gap-3">
        <Link
          href="/me/perfil"
          prefetch
          aria-label="Meu perfil"
          style={{ touchAction: "manipulation" }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <AvatarImage name={profile.name} url={profile.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
              Poker Pi
            </span>
            <h1 className="mt-0.5 font-display text-xl font-light leading-tight tracking-tight text-paper sm:text-2xl break-words">
              Olá, {profile.name.split(" ")[0]}
            </h1>
            {profile.nickname && (
              <p className="truncate font-display text-sm italic text-gold">
                {profile.nickname}
              </p>
            )}
          </div>
        </Link>
        <LogoutMeButton />
      </header>

      <section className="mt-8 space-y-4 flex-1 sm:mt-10 sm:space-y-5">
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
          <ul className="space-y-3 sm:space-y-4">
            {myEvents.map((ev) => {
              const isActive = ev.event.state === "EM_ANDAMENTO";
              const inSomeTable = ev.myMatchTableId !== null;

              return (
                <li
                  key={ev.event.id}
                  className="rounded-lg border border-line bg-ink-2 p-4 space-y-3 sm:p-5 sm:space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-lg font-light text-paper sm:text-xl break-words">
                          {ev.event.name}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-gray-soft">
                          {formatDateBR(ev.event.event_date)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-gold/40 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                        {EVENT_STATE_LABEL[ev.event.state] ?? ev.event.state}
                      </span>
                    </div>
                    <div className="inline-flex rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                      Você: {ev.player.state}
                    </div>
                  </div>

                  {isActive ? (
                    <div className="space-y-2 border-t border-line pt-3 sm:pt-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                        Mesas disponíveis
                      </p>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ev.tables.map((t) => {
                          const youAreHere = ev.myMatchTableId === t.id;
                          const isBusyElsewhere = inSomeTable && !youAreHere;
                          const isFinalized = t.state === "FINALIZADA";

                          return (
                            <li
                              key={t.id}
                              className={`rounded-md border p-3 space-y-2 ${
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
                              <TableActions
                                physicalTableId={t.id}
                                youAreHere={youAreHere}
                                isBusyElsewhere={isBusyElsewhere}
                                isFinalized={isFinalized}
                                hasPaid={ev.player.has_paid_buyin}
                                playerState={ev.player.state}
                              />
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
