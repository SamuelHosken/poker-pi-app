import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { listPlayersForEvent, listProfilesAvailableForEvent } from "@/lib/tournament/players";
import {
  getMatchesForEvent,
  getParticipationsForMatch,
  hasReversibleAction,
} from "@/lib/tournament/matches";
import { getEliminatedWithRebuyStatus } from "@/lib/tournament/rebuy";
import { formatBRL, formatDateBR } from "@/lib/format";
import { AdvanceStateButton } from "./advance-state-button";
import { PlayersSection } from "./players-section";
import { MatchControls } from "./match-controls";
import { MatchPlayersSection } from "./match-players-section";
import { UndoButton } from "./undo-button";
import { RebuySection } from "./rebuy-section";
import { EndEventButton } from "./end-event-button";
import { DeleteEventButton } from "./delete-event-button";
import { CrownChampionControl } from "./crown-champion-control";
import { LiveRefresh } from "@/components/live-refresh";

const STATE_LABEL: Record<string, string> = {
  SETUP: "Setup",
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

const MIN_PLAYERS_TO_START = 2;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    detail,
    players,
    matchesData,
    canUndo,
    eliminatedRebuy,
    availableProfiles,
  ] = await Promise.all([
    getEvent(id),
    listPlayersForEvent(id),
    getMatchesForEvent(id),
    hasReversibleAction(id),
    getEliminatedWithRebuyStatus(id),
    listProfilesAvailableForEvent(id),
  ]);

  if (!detail) notFound();
  const { event, physicalTables } = detail;
  const { matches } = matchesData;

  const presentes = players.filter((p) => p.state === "PRESENTE");

  const activeMatchByTable: Record<string, (typeof matches)[number] | undefined> = {};
  for (const t of physicalTables) {
    activeMatchByTable[t.id] = matches.find(
      (m) => m.physical_table_id === t.id && m.state !== "FINALIZADA",
    );
  }

  // Carrega participations das partidas ativas + mesa final (mesmo se LIVRE)
  const matchIdsToLoad = Array.from(
    new Set([
      ...Object.values(activeMatchByTable)
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => m.id),
      ...matches.filter((m) => m.is_final_table).map((m) => m.id),
    ]),
  );
  const participationsByMatch = Object.fromEntries(
    await Promise.all(
      matchIdsToLoad.map(async (mid) => [mid, await getParticipationsForMatch(mid)] as const),
    ),
  );

  const canStart = presentes.length >= MIN_PLAYERS_TO_START;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={5000} />
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin/events"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Eventos
        </Link>
        <UndoButton eventId={event.id} enabled={canUndo} />
      </div>

      <header className="space-y-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Evento
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-5xl break-words">
          {event.name}
        </h1>

        {/* Meta info empilhada em mobile, lado a lado em desktop */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              Data
            </dt>
            <dd className="font-mono text-xs text-paper sm:text-sm">
              {formatDateBR(event.event_date)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              Buy-in
            </dt>
            <dd className="font-mono text-xs text-paper sm:text-sm">
              {formatBRL(event.buy_in_cents)}
            </dd>
          </div>
          {event.rebuy_cents != null && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
                Rebuy
              </dt>
              <dd className="font-mono text-xs text-paper sm:text-sm">
                {formatBRL(event.rebuy_cents)}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              Estado
            </dt>
            <dd>
              <span className="inline-flex rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                {STATE_LABEL[event.state] ?? event.state}
              </span>
            </dd>
          </div>
        </dl>

        <div className="font-mono text-xs text-gray-soft">
          TV pública:{" "}
          <Link
            href={`/tv/${event.id}`}
            target="_blank"
            className="text-gold underline-offset-4 hover:underline break-all"
          >
            /tv/{event.id.slice(0, 8)}…
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {event.state === "SETUP" && (
          <AdvanceStateButton
            eventId={event.id}
            targetState="CREDENCIAMENTO"
            label="Avançar para Credenciamento"
          />
        )}
        {event.state === "CREDENCIAMENTO" && (
          <AdvanceStateButton
            eventId={event.id}
            targetState="EM_ANDAMENTO"
            label={
              canStart
                ? `Avançar para Em andamento (${presentes.length} presentes)`
                : `Adicione pelo menos ${MIN_PLAYERS_TO_START} pessoas`
            }
            disabled={!canStart}
          />
        )}
        <Link
          href={`/admin/events/${event.id}/tv`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/5 px-5 text-sm text-gold transition-colors hover:bg-gold/10 sm:w-auto"
        >
          Configuração da TV
        </Link>
      </div>

      {(event.state === "CREDENCIAMENTO" || event.state === "EM_ANDAMENTO") && (
        <PlayersSection
          eventId={event.id}
          players={players}
          availableProfiles={availableProfiles}
          physicalTables={physicalTables}
        />
      )}

      {event.state === "EM_ANDAMENTO" && (
        <RebuySection
          eliminated={eliminatedRebuy}
          rebuyLimit={event.rebuy_limit_per_player}
        />
      )}

      {event.state === "ENCERRADO" && (
        <EncerradoSummary eventId={event.id} players={players} />
      )}

      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          {event.state === "MESA_FINAL" ? "Mesa Final" : "Mesas físicas"}
        </h2>
        <ul
          className={`grid gap-3 ${
            event.state === "MESA_FINAL" || event.state === "ENCERRADO"
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {physicalTables
            .filter((t) =>
              event.state === "MESA_FINAL" || event.state === "ENCERRADO"
                ? matches.some((m) => m.physical_table_id === t.id && m.is_final_table)
                : true,
            )
            .map((t) => {
              const match =
                event.state === "MESA_FINAL" || event.state === "ENCERRADO"
                  ? matches.find((m) => m.physical_table_id === t.id && m.is_final_table)
                  : activeMatchByTable[t.id];
              const parts = match ? participationsByMatch[match.id] : undefined;
              return (
                <li
                  key={t.id}
                  className="space-y-3 rounded-lg border border-line bg-ink-2 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl text-paper sm:text-2xl">
                      {match?.is_final_table ? "Mesa Final" : `Mesa ${t.table_number}`}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                      {TABLE_STATE_LABEL[t.state] ?? t.state}
                    </span>
                  </div>

                  {(event.state === "EM_ANDAMENTO" || event.state === "MESA_FINAL") && (
                    <MatchControls table={t} match={match} />
                  )}

                  {match && parts && parts.length > 0 && (
                    <MatchPlayersSection matchId={match.id} participations={parts} />
                  )}
                </li>
              );
            })}
        </ul>
      </section>

      {(event.state === "EM_ANDAMENTO" || event.state === "ENCERRADO") &&
        players.length > 0 && (
          <section className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:p-5">
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                Coroação
              </span>
              <p className="font-mono text-xs text-gray-soft">
                {players.find((p) => p.state === "CAMPEAO")
                  ? "Já tem campeão definido. Pode trocar se errou."
                  : "Quando o torneio acabar, escolha o vencedor. Evento é encerrado e ele entra na galeria."}
              </p>
            </div>
            <CrownChampionControl
              eventId={event.id}
              players={players}
              currentChampionId={
                players.find((p) => p.state === "CAMPEAO")?.id ?? null
              }
            />
          </section>
        )}

      {event.state === "EM_ANDAMENTO" && (
        <div className="flex justify-center pt-4 sm:pt-6">
          <EndEventButton eventId={event.id} />
        </div>
      )}

      {/* Danger zone */}
      <section className="mt-8 space-y-3 rounded-xl border border-red-poker/30 bg-red-poker/5 p-4 sm:p-5">
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
            Zona de perigo
          </span>
          <p className="font-mono text-xs text-gray-soft">
            Apagar o evento remove jogadores, partidas, blinds e histórico —
            irreversível.
          </p>
        </div>
        <DeleteEventButton eventId={event.id} eventName={event.name} />
      </section>
    </main>
  );
}

function EncerradoSummary({
  eventId,
  players,
}: {
  eventId: string;
  players: { id: string; name: string; nickname: string | null; state: string; final_position: number | null }[];
}) {
  const champ = players.find((p) => p.state === "CAMPEAO");
  const vice = players.find((p) => p.state === "VICE");
  const terceiro = players.find((p) => p.state === "TERCEIRO");

  return (
    <section className="space-y-4 rounded-lg border border-gold/40 bg-gradient-to-b from-ink-2 to-ink p-5 sm:p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Torneio encerrado
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-5xl break-words">
          {champ ? (
            <>
              Campeão:{" "}
              <em className="not-italic italic text-gold">{champ.name}</em>
            </>
          ) : (
            "Campeão não definido"
          )}
        </h2>
        {(vice || terceiro) && (
          <p className="text-sm text-gray-soft">
            {vice && <>Vice: {vice.name}</>}
            {vice && terceiro && " · "}
            {terceiro && <>3º: {terceiro.name}</>}
          </p>
        )}
      </div>
      <Link
        href={`/admin/events/${eventId}/results`}
        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-gold/40 px-5 font-mono text-xs uppercase tracking-[0.18em] text-gold hover:bg-gold/10 sm:w-auto"
      >
        Ver classificação completa
      </Link>
    </section>
  );
}
