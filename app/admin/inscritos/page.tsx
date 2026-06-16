import { getAllSubscriptions } from "@/lib/tournament/subscriptions";
import { formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { InscritosToolbar } from "./inscritos-toolbar";

export const metadata = {
  title: "Inscritos · Poker Pi",
};

export default async function InscritosPage() {
  const { count, attendedCount, firstTimerCount, rows } =
    await getAllSubscriptions();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <LiveRefresh intervalMs={15000} />

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          PokerPi · Nova edição
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl">
          Inscritos
        </h1>
        <p className="font-mono text-xs text-gray-soft">
          {count === 0
            ? "nenhuma inscrição ainda"
            : `${count} inscrito${count === 1 ? "" : "s"}`}
        </p>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={count} tone="paper" />
        <Stat label="Foram à 1ª" value={attendedCount} tone="gold" />
        <Stat label="Primeira vez" value={firstTimerCount} tone="felt" />
      </section>

      <InscritosToolbar rows={rows} />

      {count === 0 ? (
        <div className="rounded-2xl border border-line bg-ink-2 px-6 py-12 text-center">
          <p className="text-sm text-gray-soft">
            Ainda não chegou nenhuma inscrição. Compartilhe o link acima.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-hidden rounded-2xl border border-line sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-mid">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">1ª edição?</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-line/60 last:border-0 hover:bg-ink-2/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-mid tabular-nums">
                      {count - i}
                    </td>
                    <td className="px-4 py-3 font-medium text-paper">
                      {r.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${r.email}`}
                        className="text-gray-soft underline-offset-2 hover:text-gold hover:underline"
                      >
                        {r.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-gray-soft">
                      <a
                        href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-gold"
                      >
                        {r.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <AttendedBadge attended={r.attended_first_edition} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-mid">
                      {formatDateBR(r.created_at, "dd/MM 'às' HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: cards */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-ink-2 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    #{count - i}
                  </span>
                  <AttendedBadge attended={r.attended_first_edition} />
                </div>
                <p className="font-medium text-paper">{r.full_name}</p>
                <a
                  href={`mailto:${r.email}`}
                  className="mt-0.5 block truncate text-sm text-gray-soft hover:text-gold"
                >
                  {r.email}
                </a>
                <div className="mt-1 flex items-center justify-between">
                  <a
                    href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs tabular-nums text-gray-soft hover:text-gold"
                  >
                    {r.phone}
                  </a>
                  <span className="font-mono text-[10px] text-gray-mid">
                    {formatDateBR(r.created_at, "dd/MM 'às' HH:mm")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "paper" | "gold" | "felt";
}) {
  const color =
    tone === "gold"
      ? "text-gold"
      : tone === "felt"
        ? "text-felt"
        : "text-paper";
  return (
    <div className="rounded-xl border border-line bg-ink-2 p-4 text-center">
      <span className={`block font-display text-3xl font-light tabular-nums ${color}`}>
        {value}
      </span>
      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-gray-mid">
        {label}
      </span>
    </div>
  );
}

function AttendedBadge({ attended }: { attended: boolean }) {
  return attended ? (
    <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
      Veterano
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-line bg-ink px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-soft">
      Estreante
    </span>
  );
}
