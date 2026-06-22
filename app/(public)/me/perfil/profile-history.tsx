import { formatDateBR } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { playerStateLabel, eventStateLabel } from "@/lib/ui-labels";
import type { EventState, PlayerState } from "@/lib/types/domain";
import type { MyHistoryItem } from "@/lib/tournament/profiles";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}min`;
}

function positionLabel(item: Pick<MyHistoryItem, "playerState" | "finalPosition">) {
  if (item.playerState === "CAMPEAO") return "1º";
  if (item.playerState === "VICE") return "2º";
  if (item.playerState === "TERCEIRO") return "3º";
  if (item.finalPosition != null) return `${item.finalPosition}º`;
  return null;
}

export function ProfileHistory({ history }: { history: MyHistoryItem[] }) {
  return (
    <section className="space-y-3">
      <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Histórico de eventos
      </span>

      {history.length === 0 ? (
        <Card>
          <div className="px-5 py-8 text-center font-mono text-xs text-muted-foreground">
            Você ainda não participou de nenhum evento.
          </div>
        </Card>
      ) : (
        <ul className="space-y-2">
          {history.map((item) => {
            const pos = positionLabel(item);
            const isChamp = item.playerState === "CAMPEAO";
            const isPodium =
              isChamp ||
              item.playerState === "VICE" ||
              item.playerState === "TERCEIRO";

            return (
              <li key={item.playerId}>
                <Card
                  className={
                    isChamp
                      ? "border-gold/60 bg-gold/5"
                      : isPodium
                        ? "border-gold/30"
                        : undefined
                  }
                >
                  <CardHeader className="flex-row items-center gap-3 py-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-base ${
                        isChamp
                          ? "bg-gold text-ink"
                          : isPodium
                            ? "border border-gold/40 text-gold"
                            : "border border-hair text-muted-foreground"
                      }`}
                    >
                      {pos ?? "—"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-medium text-paper">
                        {item.eventName}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {formatDateBR(item.eventDate)} ·{" "}
                        {playerStateLabel(item.playerState as PlayerState)}
                        {item.timeAtTablesSeconds != null &&
                          item.timeAtTablesSeconds > 0 && (
                            <> · {formatDuration(item.timeAtTablesSeconds)}</>
                          )}
                        {item.rebuysUsed > 0 && (
                          <>
                            {" "}
                            · {item.rebuysUsed} rebuy
                            {item.rebuysUsed === 1 ? "" : "s"}
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-hair px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {eventStateLabel(item.eventState as EventState)}
                    </span>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
