import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { formatBRL, formatDateBR } from "@/lib/format";
import { AdvanceStateButton } from "./advance-state-button";

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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEvent(id);
  if (!detail) notFound();

  const { event, blindLevels, physicalTables } = detail;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 space-y-10">
      <Link
        href="/admin/events"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Eventos
      </Link>

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
      </header>

      {event.state === "SETUP" && (
        <AdvanceStateButton
          eventId={event.id}
          targetState="CREDENCIAMENTO"
          label="Avançar para Credenciamento"
        />
      )}

      <section className="space-y-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Mesas físicas
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {physicalTables.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-line bg-ink-2 p-4 text-center"
            >
              <div className="font-display text-2xl text-paper">Mesa {t.table_number}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                {TABLE_STATE_LABEL[t.state] ?? t.state}
              </div>
            </li>
          ))}
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
