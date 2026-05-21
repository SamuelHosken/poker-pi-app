import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { listPlayersForEvent } from "@/lib/tournament/players";
import { formatBRL, formatDateBR } from "@/lib/format";

const PLAYER_STATE_LABEL: Record<string, string> = {
  INSCRITO: "Inscrito",
  PRESENTE: "Não jogou",
  CHAMADO: "Chamado",
  JOGANDO: "Jogando",
  ELIMINADO: "Eliminado",
  CLASSIFICADO: "Classificado",
  NA_FINAL: "Mesa Final",
  CAMPEAO: "Campeão",
  VICE: "Vice",
  TERCEIRO: "3º lugar",
  OUTROS_FINALISTAS: "Finalista",
};

const FINALIST_STATES = new Set(["CAMPEAO", "VICE", "TERCEIRO", "OUTROS_FINALISTAS"]);

export const metadata = {
  title: "Resultados · Poker Pi",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, players] = await Promise.all([
    getEvent(id),
    listPlayersForEvent(id),
  ]);
  if (!detail) notFound();
  const { event } = detail;

  // Ordenação: campeão primeiro, depois 2º, 3º, outros finalistas, eliminados.
  const sorted = [...players].sort((a, b) => {
    const aFinal = FINALIST_STATES.has(a.state);
    const bFinal = FINALIST_STATES.has(b.state);
    if (aFinal && !bFinal) return -1;
    if (!aFinal && bFinal) return 1;
    if (a.final_position != null && b.final_position != null) {
      return a.final_position - b.final_position;
    }
    if (a.final_position != null) return -1;
    if (b.final_position != null) return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 space-y-8">
      <Link
        href={`/admin/events/${id}`}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Evento
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Classificação final
        </span>
        <h1 className="font-display text-4xl font-light tracking-tight text-paper">
          {event.name}
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          {formatDateBR(event.event_date)} · Buy-in {formatBRL(event.buy_in_cents)}
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-ink-2 text-gray-soft">
            <tr>
              <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                Posição
              </th>
              <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                Jogador
              </th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                Estado
              </th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                Rebuys
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const positionLabel =
                p.state === "CAMPEAO"
                  ? "1º"
                  : p.state === "VICE"
                    ? "2º"
                    : p.state === "TERCEIRO"
                      ? "3º"
                      : p.final_position != null
                        ? `${p.final_position}º`
                        : "—";
              const isPodium =
                p.state === "CAMPEAO" || p.state === "VICE" || p.state === "TERCEIRO";
              return (
                <tr
                  key={p.id}
                  className={`border-t border-line ${isPodium ? "bg-ink-2" : ""}`}
                >
                  <td
                    className={`px-4 py-2 font-mono ${
                      p.state === "CAMPEAO" ? "text-gold" : "text-paper"
                    }`}
                  >
                    {positionLabel}
                  </td>
                  <td className="px-4 py-2 text-paper">
                    {p.name}
                    {p.nickname && (
                      <span className="ml-2 font-display text-xs italic text-gold">
                        {p.nickname}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {PLAYER_STATE_LABEL[p.state] ?? p.state}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-soft">
                    {p.rebuys_used}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ExportJsonLink eventId={id} sorted={sorted} eventName={event.name} />
    </main>
  );
}

function ExportJsonLink({
  eventId,
  sorted,
  eventName,
}: {
  eventId: string;
  sorted: Array<{
    id: string;
    name: string;
    nickname: string | null;
    state: string;
    final_position: number | null;
    rebuys_used: number;
  }>;
  eventName: string;
}) {
  const payload = {
    eventId,
    eventName,
    exportedAt: new Date().toISOString(),
    classification: sorted.map((p, idx) => ({
      position:
        p.state === "CAMPEAO"
          ? 1
          : p.state === "VICE"
            ? 2
            : p.state === "TERCEIRO"
              ? 3
              : p.final_position ?? idx + 1,
      name: p.name,
      nickname: p.nickname,
      state: p.state,
      rebuys: p.rebuys_used,
    })),
  };
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
  return (
    <a
      href={dataUri}
      download={`poker-pi-resultados-${eventId}.json`}
      className="inline-flex h-10 items-center rounded-md border border-line px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:border-gold/50 hover:text-gold"
    >
      Exportar JSON
    </a>
  );
}
