import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyProfileWithHistory } from "@/lib/tournament/profiles";
import { formatBRL, formatDateBR } from "@/lib/format";
import { AvatarUploader } from "./avatar-uploader";

export const metadata = {
  title: "Meu perfil · Poker Pi",
};

const EVENT_STATE_LABEL: Record<string, string> = {
  SETUP: "Em setup",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

const PLAYER_STATE_LABEL: Record<string, string> = {
  INSCRITO: "Inscrito",
  PRESENTE: "Não jogou",
  CHAMADO: "Chamado",
  JOGANDO: "Jogando",
  ELIMINADO: "Eliminado",
  CLASSIFICADO: "Classificado",
  NA_FINAL: "Mesa final",
  CAMPEAO: "Campeão",
  VICE: "Vice",
  TERCEIRO: "3º lugar",
  OUTROS_FINALISTAS: "Finalista",
};

function positionLabel(item: { playerState: string; finalPosition: number | null }) {
  if (item.playerState === "CAMPEAO") return "1º";
  if (item.playerState === "VICE") return "2º";
  if (item.playerState === "TERCEIRO") return "3º";
  if (item.finalPosition != null) return `${item.finalPosition}º`;
  return null;
}

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

export default async function PerfilPage() {
  const data = await getMyProfileWithHistory();
  if (!data) notFound();

  const { profile, email, history, stats } = data;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10 space-y-6 sm:space-y-7">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/me"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
        >
          ← Voltar
        </Link>
      </div>

      <header className="space-y-2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Meu perfil
        </span>
        <AvatarUploader name={profile.name} currentUrl={profile.avatar_url} />
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl break-words">
          {profile.name}
        </h1>
        {profile.nickname && (
          <p className="font-display text-base italic text-gold sm:text-lg">
            {profile.nickname}
          </p>
        )}
      </header>

      {/* Dados pessoais */}
      <section className="space-y-3 rounded-xl border border-line bg-ink-2 p-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Dados
        </span>
        <dl className="space-y-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              Nome
            </dt>
            <dd className="text-paper">{profile.name}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              Apelido
            </dt>
            <dd className="font-display italic text-gold">
              {profile.nickname ?? <span className="not-italic text-gray-mid">—</span>}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
              E-mail
            </dt>
            <dd className="break-all text-paper">
              {email ?? <span className="text-gray-mid">—</span>}
            </dd>
          </div>
        </dl>
      </section>

      {/* Stats principais — só aparece se já participou */}
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
            <StatCard
              label="Total gasto"
              value={formatBRL(stats.totalSpentCents)}
            />
            <StatCard
              label="Fichas mostradas"
              value={String(stats.chipDisplayCount)}
            />
          </div>
        </section>
      )}

      {/* Fichas mostradas em destaque */}
      {stats.chipDisplayCount > 0 && (
        <section className="space-y-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Fichas na TV
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gold/40 bg-gold/5 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                Maior monte
              </span>
              <div className="mt-1 font-display text-3xl font-light tabular-nums text-gold">
                {(stats.maxChipsShown ?? 0).toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-ink-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                Total acumulado
              </span>
              <div className="mt-1 font-display text-3xl font-light tabular-nums text-paper">
                {stats.totalChipsShown.toLocaleString("pt-BR")}
              </div>
            </div>
          </div>

          {stats.recentChipDisplays.length > 0 && (
            <details className="rounded-lg border border-line bg-ink-2/40 p-3 [&_summary]:cursor-pointer [&[open]_summary]:mb-3">
              <summary className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-gold">
                Últimas exibições ({stats.recentChipDisplays.length})
              </summary>
              <ul className="space-y-1.5">
                {stats.recentChipDisplays.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs"
                  >
                    <span className="truncate text-gray-soft">
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
            <div className="rounded-lg border border-gold/30 bg-ink-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
                Eliminações causadas
              </span>
              <div className="mt-1 font-display text-3xl font-light text-gold">
                {stats.eliminationsCaused}
              </div>
              {stats.topVictim && (
                <div className="mt-2 font-mono text-[10px] text-gray-soft">
                  Mais vítima:{" "}
                  <span className="text-paper">{stats.topVictim.name.split(" ")[0]}</span>
                  {stats.topVictim.count > 1 && ` (${stats.topVictim.count}×)`}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-red-poker/30 bg-ink-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-poker">
                Eliminações sofridas
              </span>
              <div className="mt-1 font-display text-3xl font-light text-red-poker">
                {stats.eliminationsSuffered}
              </div>
              {stats.topNemesis && (
                <div className="mt-2 font-mono text-[10px] text-gray-soft">
                  Maior carrasco:{" "}
                  <span className="text-paper">{stats.topNemesis.name.split(" ")[0]}</span>
                  {stats.topNemesis.count > 1 && ` (${stats.topNemesis.count}×)`}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Histórico */}
      <section className="space-y-3 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Histórico de eventos
        </span>

        {history.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-ink-2 px-4 py-8 text-center font-mono text-xs text-gray-soft">
            Você ainda não participou de nenhum evento.
          </p>
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
                <li
                  key={item.playerId}
                  className={`flex items-center gap-3 rounded-md border p-3 ${
                    isChamp
                      ? "border-gold/60 bg-gold/5"
                      : isPodium
                        ? "border-gold/30 bg-ink-2"
                        : "border-line bg-ink-2"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md font-mono text-base ${
                      isChamp
                        ? "bg-gold text-ink"
                        : isPodium
                          ? "border border-gold/40 text-gold"
                          : "border border-line text-gray-soft"
                    }`}
                  >
                    {pos ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-paper">{item.eventName}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                      {formatDateBR(item.eventDate)} ·{" "}
                      {PLAYER_STATE_LABEL[item.playerState] ?? item.playerState}
                      {item.timeAtTablesSeconds != null &&
                        item.timeAtTablesSeconds > 0 && (
                          <> · {formatDuration(item.timeAtTablesSeconds)}</>
                        )}
                      {item.rebuysUsed > 0 && (
                        <> · {item.rebuysUsed} rebuy{item.rebuysUsed === 1 ? "" : "s"}</>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
                    {EVENT_STATE_LABEL[item.eventState] ?? item.eventState}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
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
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-gold/40 bg-gold/5" : "border-line bg-ink-2"
      }`}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-soft">
        {label}
      </span>
      <div
        className={`mt-1 font-display text-2xl font-light leading-none tabular-nums ${
          highlight ? "text-gold" : "text-paper"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
