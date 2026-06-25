import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getMyProfile } from "@/lib/tournament/profiles";
import { AvatarImage } from "@/components/ui/avatar-image";
import { getMyEvents } from "@/lib/tournament/player-actions";
import { formatDateBR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { playerStateLabel, tableStateLabel, eventStateLabel } from "@/lib/ui-labels";
import type { EventState, PlayerState, MatchState } from "@/lib/types/domain";
import { LogoutMeButton } from "./logout-me-button";
import { TableActions } from "./table-actions";
import { LiveRefresh } from "@/components/live-refresh";
import { MePlayerRealtime } from "./me-player-realtime";

export const metadata = {
  title: "Sua sessão · Poker Pi",
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
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <Badge variant="destructive" className="uppercase tracking-wide">
          Sessão inválida
        </Badge>
        <h1 className="font-display text-2xl font-light tracking-tight">
          Não conseguimos identificar seu perfil.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua sessão está em estado inconsistente (cookie válido mas perfil não
          encontrado). Faça logout e login novamente.
        </p>
        <LogoutMeButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Broadcast realtime (admin marca pago / adiciona player) — instantâneo. */}
      <MePlayerRealtime />
      {/* Fallback de polling — captura mudanças que não broadcast (ex.: outra TV
          do mesmo player, ou ações que não chamam o broadcast). */}
      <LiveRefresh intervalMs={5000} />

      {profile.is_admin && (
        <Link
          href="/admin/events"
          prefetch
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-gold/30 bg-gold/5 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10"
        >
          ← Painel admin
        </Link>
      )}

      {/* Header */}
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
            <span className="text-xs font-medium uppercase tracking-widest text-gold">
              Poker Pi
            </span>
            <h1 className="mt-0.5 break-words font-display text-2xl font-bold tracking-tight text-paper">
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

      {/* Events section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-gold">
          Seus eventos
        </h2>

        {myEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CalendarClock className="size-10 text-muted-foreground opacity-50" />
              <div className="space-y-1">
                <p className="font-display text-base font-medium text-paper">
                  Nenhum evento ainda
                </p>
                <p className="text-sm text-muted-foreground">
                  Assim que o organizador te incluir, o evento aparece aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {myEvents.map((ev) => {
              const isActive = ev.event.state === "EM_ANDAMENTO";
              const inSomeTable = ev.myMatchTableId !== null;

              return (
                <li key={ev.event.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="break-words font-display text-lg font-semibold text-paper">
                            {ev.event.name}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateBR(ev.event.event_date)}
                          </div>
                        </div>
                        <Badge
                          variant={isActive ? "live" : "neutral"}
                          className="shrink-0"
                        >
                          {eventStateLabel(ev.event.state as EventState)}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <Badge variant="gold">
                          Você: {playerStateLabel(ev.player.state as PlayerState)}
                        </Badge>
                      </div>
                    </CardHeader>

                    {isActive ? (
                      <CardContent className="flex flex-col gap-3 border-t border-hair pt-4">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                          Mesas disponíveis
                        </p>
                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {ev.tables.map((t) => {
                            const youAreHere = ev.myMatchTableId === t.id;
                            const isBusyElsewhere = inSomeTable && !youAreHere;
                            const isFinalized = t.state === "FINALIZADA";

                            return (
                              <li key={t.id}>
                                <Card
                                  className={
                                    youAreHere
                                      ? "border-gold/50 bg-gold/5"
                                      : undefined
                                  }
                                >
                                  <CardHeader className="pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-display text-base font-semibold text-paper">
                                        Mesa {t.table_number}
                                      </span>
                                      <Badge variant="neutral">
                                        {tableStateLabel(t.state as MatchState)}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-3">
                                    <TableActions
                                      physicalTableId={t.id}
                                      youAreHere={youAreHere}
                                      isBusyElsewhere={isBusyElsewhere}
                                      isFinalized={isFinalized}
                                      hasPaid={ev.player.has_paid_buyin}
                                      playerState={ev.player.state}
                                    />
                                  </CardContent>
                                </Card>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    ) : (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          {ev.event.state === "ENCERRADO"
                            ? "Evento encerrado"
                            : "Evento ainda não começou"}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
