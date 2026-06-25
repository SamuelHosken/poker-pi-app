import { formatBRL, formatDateBR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileStats } from "@/lib/tournament/profiles";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}min`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return formatDateBR(iso);
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-gold/40 bg-gold/5" : undefined}>
      <CardContent className="space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <div
          className={`font-display text-2xl font-light leading-none tabular-nums ${
            highlight ? "text-gold" : "text-paper"
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileStats({ stats }: { stats: ProfileStats }) {
  return (
    <>
      {/* Estatísticas */}
      {stats.totalEvents > 0 && (
        <section className="space-y-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Estatísticas
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Eventos" value={String(stats.totalEvents)} />
            <StatCard
              label="Campeonatos"
              value={String(stats.champCount)}
              highlight={stats.champCount > 0}
            />
            <StatCard
              label="Pódios"
              value={String(stats.podiumCount)}
              highlight={stats.podiumCount > 0}
            />
            <StatCard
              label="Melhor posição"
              value={stats.bestPosition != null ? `${stats.bestPosition}º` : "—"}
              highlight={stats.bestPosition === 1}
            />
            <StatCard
              label="Posição média"
              value={stats.avgPosition != null ? `${stats.avgPosition}º` : "—"}
            />
            <StatCard
              label="Tempo em mesa"
              value={
                stats.totalTableTimeSeconds > 0
                  ? formatDuration(stats.totalTableTimeSeconds)
                  : "—"
              }
            />
            <StatCard label="Total gasto" value={formatBRL(stats.totalSpentCents)} />
            <StatCard
              label="Fichas mostradas"
              value={String(stats.chipDisplayCount)}
            />
          </div>
        </section>
      )}

      {/* Fichas na TV */}
      {stats.chipDisplayCount > 0 && (
        <section className="space-y-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Fichas na TV
          </span>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-gold/40 bg-gold/5">
              <CardContent className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  Maior monte
                </span>
                <div className="font-display text-3xl font-light tabular-nums text-gold">
                  {(stats.maxChipsShown ?? 0).toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Total acumulado
                </span>
                <div className="font-display text-3xl font-light tabular-nums text-paper">
                  {stats.totalChipsShown.toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.recentChipDisplays.length > 0 && (
            <details className="rounded-2xl border border-hair bg-surface px-4 py-3 [&_summary]:cursor-pointer [&[open]_summary]:mb-3">
              <summary className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold">
                Últimas exibições ({stats.recentChipDisplays.length})
              </summary>
              <ul className="space-y-1.5">
                {stats.recentChipDisplays.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-hair bg-ink px-3 py-2 font-mono text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {c.eventName} · {formatRelative(c.createdAt)}
                    </span>
                    <span className="shrink-0 font-display text-base text-gold">
                      {c.amount.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* Rivalidades */}
      {(stats.eliminationsCaused > 0 || stats.eliminationsSuffered > 0) && (
        <section className="space-y-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Rivalidades
          </span>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-gold/30">
              <CardContent className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
                  Eliminações causadas
                </span>
                <div className="font-display text-3xl font-light text-gold">
                  {stats.eliminationsCaused}
                </div>
                {stats.topVictim && (
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Mais vítima:{" "}
                    <span className="text-paper">
                      {stats.topVictim.name.split(" ")[0]}
                    </span>
                    {stats.topVictim.count > 1 && ` (${stats.topVictim.count}×)`}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-red-poker/30">
              <CardContent className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker">
                  Eliminações sofridas
                </span>
                <div className="font-display text-3xl font-light text-red-poker">
                  {stats.eliminationsSuffered}
                </div>
                {stats.topNemesis && (
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Maior carrasco:{" "}
                    <span className="text-paper">
                      {stats.topNemesis.name.split(" ")[0]}
                    </span>
                    {stats.topNemesis.count > 1 && ` (${stats.topNemesis.count}×)`}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </>
  );
}
