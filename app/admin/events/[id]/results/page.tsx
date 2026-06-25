import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/tournament/events";
import { listPlayersForEvent } from "@/lib/tournament/players";
import { formatBRL, formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AvatarImage } from "@/components/ui/avatar-image";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={10000} />
      <Link
        href={`/admin/events/${id}`}
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-paper"
      >
        ← Evento
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Classificação final
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl break-words">
          {event.name}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          {formatDateBR(event.event_date)} · Buy-in {formatBRL(event.buy_in_cents)}
        </p>
      </header>

      <Card size="sm" className="py-0">
        <CardContent className="px-0 divide-y divide-hair">
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
            const isChamp = p.state === "CAMPEAO";

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  isChamp ? "bg-gold/5" : ""
                }`}
              >
                {/* Position badge */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-medium ${
                    isChamp
                      ? "bg-gold text-ink"
                      : isPodium
                        ? "border border-gold/40 text-gold"
                        : "border border-hair text-muted-foreground"
                  }`}
                >
                  {positionLabel}
                </div>

                {/* Avatar */}
                <AvatarImage
                  name={p.name}
                  size="sm"
                  variant={isChamp ? "gold" : "inline"}
                />

                {/* Name + status */}
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${isChamp ? "text-gold" : "text-paper"}`}>
                    {p.name}
                    {p.nickname && (
                      <span className="ml-2 font-display text-xs italic text-gold">
                        {p.nickname}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {PLAYER_STATE_LABEL[p.state] ?? p.state}
                    {p.rebuys_used > 0 && ` · ${p.rebuys_used} rebuy${p.rebuys_used === 1 ? "" : "s"}`}
                  </div>
                </div>

                {/* Rebuys (desktop only) */}
                {p.rebuys_used > 0 && (
                  <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                    {p.rebuys_used}×
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

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
      className={buttonVariants({ variant: "secondary" })}
    >
      Exportar JSON
    </a>
  );
}
