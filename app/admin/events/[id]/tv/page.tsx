import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { getMatchesForEvent } from "@/lib/tournament/matches";
import { formatBRL, formatDateBR } from "@/lib/format";
import { TvActions } from "./tv-actions";
import { MesaLiveControl } from "./mesa-live-control";
import { BlindsEditor } from "./blinds-editor";
import { AllTablesControls } from "./all-tables-controls";
import { TvPauseControl } from "./tv-pause-control";
import { TvStartControl } from "./tv-start-control";
import { AutoAdvanceToggle } from "./auto-advance-toggle";
import { ResetBlindsButton } from "./reset-blinds-button";
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

export const metadata = {
  title: "Configuração da TV · Poker Pi",
};

export default async function TvConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, matchesData, headersList] = await Promise.all([
    getEvent(id),
    getMatchesForEvent(id),
    headers(),
  ]);

  if (!detail) notFound();
  const { event, blindLevels, physicalTables } = detail;
  const { matches, levelsById } = matchesData;

  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const tvUrl = `${protocol}://${host}/tv/${event.id}`;

  const activeMatchByTable: Record<string, (typeof matches)[number] | undefined> = {};
  for (const t of physicalTables) {
    activeMatchByTable[t.id] = matches.find(
      (m) => m.physical_table_id === t.id && m.state !== "FINALIZADA",
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={5000} />
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/admin/events/${event.id}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Evento
        </Link>
        <span className="inline-flex rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {STATE_LABEL[event.state] ?? event.state}
        </span>
      </div>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Configuração da TV
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl break-words">
          {event.name}
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          {formatDateBR(event.event_date)} · Buy-in {formatBRL(event.buy_in_cents)}
        </p>
      </header>

      {/* Telão público */}
      <section className="space-y-4 rounded-xl border border-line bg-ink-2 p-4 sm:p-5">
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            Telão público
          </span>
          <p className="font-display text-lg font-light text-paper sm:text-xl">
            Abra esse link em qualquer tela — TV, monitor, segunda tela.
          </p>
        </div>

        <code className="block break-all rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs text-gray-soft">
          {tvUrl}
        </code>

        <TvActions tvUrl={tvUrl} />

        <TvStartControl
          eventId={event.id}
          currentStartsAt={event.tv_starts_at ?? null}
        />

        <TvPauseControl
          eventId={event.id}
          currentMessage={event.tv_paused_message ?? null}
        />
      </section>

      {/* Mesas — cronômetro vivo + estrutura por mesa */}
      <section className="space-y-3">
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Mesas
          </span>
          <p className="font-mono text-xs text-gray-soft">
            Cada mesa roda seu próprio cronômetro e tem sua própria estrutura de
            blinds. Ajuste +/- 1min, pause, avance nível ou edite os blinds. Quando
            o tempo acaba, segue contando negativo até apertar &ldquo;Próximo nível&rdquo;.
          </p>
        </div>

        <AllTablesControls
          eventId={event.id}
          hasPlaying={matches.some((m) => m.state === "JOGANDO")}
          hasPaused={matches.some((m) => m.state === "PAUSADA")}
        />

        <AutoAdvanceToggle
          eventId={event.id}
          enabled={event.auto_advance_blinds ?? false}
        />

        <ResetBlindsButton eventId={event.id} />

        <ul className="space-y-4">
          {physicalTables.map((t) => {
            const match = activeMatchByTable[t.id];
            const currentLevel =
              match && match.current_level_id ? levelsById[match.current_level_id] : undefined;
            const tableLevels = blindLevels.filter(
              (l) => l.physical_table_id === t.id && !l.is_final_table,
            );
            return (
              <li
                key={t.id}
                className="space-y-4 rounded-xl border border-line bg-ink-2 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-2xl font-light text-paper sm:text-3xl">
                    Mesa {t.table_number}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {TABLE_STATE_LABEL[t.state] ?? t.state}
                  </span>
                </div>

                <MesaLiveControl
                  table={t}
                  match={match}
                  currentLevel={currentLevel}
                  levels={tableLevels}
                  autoAdvance={event.auto_advance_blinds ?? false}
                />

                <details className="rounded-lg border border-line bg-ink/40 p-3 [&_summary]:cursor-pointer [&[open]_summary]:mb-3">
                  <summary className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-gold">
                    Estrutura de blinds ({tableLevels.length} níveis)
                  </summary>
                  <BlindsEditor
                    physicalTableId={t.id}
                    matchId={match?.id ?? null}
                    levels={tableLevels}
                    currentLevelId={match?.current_level_id ?? null}
                  />
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Em breve */}
      <section className="space-y-3 rounded-xl border border-dashed border-line bg-ink-2/40 p-4 sm:p-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-soft">
          Em breve (V2.2)
        </span>
        <ul className="space-y-1.5 font-mono text-xs text-gray-mid">
          <li>· Overlays e efeitos na TV (chamada, fanfarra, aviso)</li>
          <li>· Fila &ldquo;Mostrar fichas&rdquo; controlada do admin</li>
          <li>· Layout de mesas (1 destaque, 2 lado a lado, grid)</li>
          <li>· Personalização visual (logo, cores, densidade, volume)</li>
          <li>· Diagnóstico Realtime (latência, conexão, histórico)</li>
        </ul>
      </section>
    </main>
  );
}
