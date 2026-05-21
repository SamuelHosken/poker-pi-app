import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { listPlayersForEvent } from "@/lib/tournament/players";
import {
  getMatchesForEvent,
  getParticipationsForMatch,
  hasReversibleAction,
} from "@/lib/tournament/matches";
import { formatBRL, formatDateBR } from "@/lib/format";
import { AdvanceStateButton } from "./advance-state-button";
import { PlayersSection } from "./players-section";
import { MatchControls } from "./match-controls";
import { MatchPlayersSection } from "./match-players-section";
import { UndoButton } from "./undo-button";

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

const MIN_PLAYERS_TO_START = 16;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, players, matchesData, canUndo] = await Promise.all([
    getEvent(id),
    listPlayersForEvent(id),
    getMatchesForEvent(id),
    hasReversibleAction(id),
  ]);

  if (!detail) notFound();
  const { event, blindLevels, physicalTables } = detail;
  const { matches } = matchesData;

  const presentes = players.filter((p) => p.state === "PRESENTE");

  const activeMatchByTable: Record<string, (typeof matches)[number] | undefined> = {};
  for (const t of physicalTables) {
    activeMatchByTable[t.id] = matches.find(
      (m) => m.physical_table_id === t.id && m.state !== "FINALIZADA",
    );
  }

  // Carrega participations apenas das partidas ativas (não-FINALIZADAS)
  const activeMatchIds = Object.values(activeMatchByTable)
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => m.id);
  const participationsByMatch = Object.fromEntries(
    await Promise.all(
      activeMatchIds.map(async (mid) => [mid, await getParticipationsForMatch(mid)] as const),
    ),
  );

  const canStart = presentes.length >= MIN_PLAYERS_TO_START;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
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
        <h1 className="font-display text-5xl font-light tracking-tight text-paper">
          {event.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-soft">
          <span className="font-mono">{formatDateBR(event.event_date)}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{formatBRL(event.buy_in_cents)}</span>
          {event.rebuy_cents != null && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono">Rebuy {formatBRL(event.rebuy_cents)}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            {STATE_LABEL[event.state] ?? event.state}
          </span>
        </div>

        <div className="font-mono text-xs text-gray-soft">
          TV pública:{" "}
          <Link
            href={`/tv/${event.id}`}
            target="_blank"
            className="text-gold underline-offset-4 hover:underline"
          >
            /tv/{event.id}
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
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
                : `Aguardando: ${presentes.length}/${MIN_PLAYERS_TO_START} presentes`
            }
            disabled={!canStart}
          />
        )}
      </div>

      {(event.state === "CREDENCIAMENTO" || event.state === "EM_ANDAMENTO") && (
        <PlayersSection eventId={event.id} players={players} />
      )}

      <section className="space-y-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Mesas físicas
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {physicalTables.map((t) => {
            const match = activeMatchByTable[t.id];
            const parts = match ? participationsByMatch[match.id] : undefined;
            return (
              <li
                key={t.id}
                className="space-y-3 rounded-lg border border-line bg-ink-2 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl text-paper">
                    Mesa {t.table_number}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {TABLE_STATE_LABEL[t.state] ?? t.state}
                  </span>
                </div>

                {event.state === "EM_ANDAMENTO" && (
                  <MatchControls
                    table={t}
                    match={match}
                    presentes={presentes}
                    tableSize={event.table_size}
                  />
                )}

                {match && parts && parts.length > 0 && (
                  <MatchPlayersSection matchId={match.id} participations={parts} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Estrutura de blinds
        </h2>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-ink-2 text-gray-soft">
              <tr>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                  Nível
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                  SB
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                  BB
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                  Ante
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                  Duração
                </th>
              </tr>
            </thead>
            <tbody>
              {blindLevels.map((lvl) => (
                <tr key={lvl.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-paper">{lvl.level_number}</td>
                  <td className="px-4 py-2 text-right font-mono text-paper">{lvl.small_blind}</td>
                  <td className="px-4 py-2 text-right font-mono text-paper">{lvl.big_blind}</td>
                  <td className="px-4 py-2 text-right font-mono text-paper">{lvl.ante}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-soft">
                    {lvl.duration_minutes} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
