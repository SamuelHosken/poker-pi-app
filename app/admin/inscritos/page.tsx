import { getAllSubscriptions } from "@/lib/tournament/subscriptions";
import { getConviteStatuses, type ConviteStatus } from "@/lib/tournament/convite-stats";
import { formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { InscritosToolbar } from "./inscritos-toolbar";
import { CountToggle } from "./count-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Inscritos",
};

export default async function InscritosPage() {
  /*
    Os convites vieram do `/admin/dashboard`, que virou redirecionamento para o
    app em 14/08/2026.

    Eles NAO foram para o app junto com o resto do painel, e o motivo e o dado:
    `convite_opens` so e escrito por `/convite/[slug]`, que e pagina deste
    projeto, e a lista de convidados (`CONVITES`) mora aqui do lado, em
    `app/(public)/inscrever/convites.ts`. Levar o painel sem levar a pagina
    deixaria o app lendo uma tabela que so este repositorio alimenta.

    Aqui e o lugar certo enquanto isso for verdade: quem abriu o convite e nao
    se inscreveu e informacao de inscrito, e esta e a tela dos inscritos.
  */
  const [{ count, attendedCount, firstTimerCount, excludedCount, rows }, convites] =
    await Promise.all([getAllSubscriptions(), getConviteStatuses()]);

  // Numera só os contabilizados (desc); os não contabilizados ficam sem número.
  let running = count;
  const items = rows.map((r) => {
    const isCounted = r.counted !== false;
    const num = isCounted ? running-- : null;
    return { r, isCounted, num };
  });

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
          {rows.length === 0
            ? "nenhuma inscrição ainda"
            : `${count} contabilizado${count === 1 ? "" : "s"}` +
              (excludedCount > 0 ? ` · ${excludedCount} fora da conta` : "")}
        </p>
      </header>

      {/* Métricas (só contabilizados) */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={count} tone="paper" />
        <Stat label="Foram à 1ª" value={attendedCount} tone="gold" />
        <Stat label="Primeira vez" value={firstTimerCount} tone="felt" />
      </section>

      {/* Convidados: quem abriu o link e nao se inscreveu vem primeiro, porque
          e a unica linha desta tela que pede uma acao de quem esta lendo. */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-light tracking-tight text-paper">Convidados</h2>
          <span className="font-mono text-[11px] text-gray-mid">
            {convites.total} link{convites.total === 1 ? "" : "s"}
            {convites.openedNotSubscribedCount > 0
              ? ` · ${convites.openedNotSubscribedCount} abriu e não inscreveu`
              : ""}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Inscritos" value={convites.subscribedCount} tone="felt" />
          <Stat label="Abriu, não inscr." value={convites.openedNotSubscribedCount} tone="gold" />
          <Stat label="Não abriu" value={convites.notOpenedCount} tone="paper" />
        </div>

        {convites.rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-ink-2 px-6 py-8 text-center">
            <p className="text-sm text-gray-soft">Nenhum convite personalizado cadastrado.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {convites.rows.map((c) => (
              <ConvidadoRow key={c.slug} c={c} />
            ))}
          </ul>
        )}
      </section>

      <InscritosToolbar rows={rows} />

      {rows.length === 0 ? (
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
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ r, isCounted, num }) => (
                  <tr
                    key={r.id}
                    className={`border-b border-line/60 last:border-0 hover:bg-ink-2/50 ${
                      isCounted ? "" : "opacity-45"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-mid tabular-nums">
                      {/* Ponto médio, nunca travessão: a linha sem número é a
                          que ficou fora da conta, e ela já vem esmaecida. */}
                      {num ?? "·"}
                    </td>
                    <td className="px-4 py-3 font-medium text-paper">
                      <span className={isCounted ? "" : "line-through"}>
                        {r.full_name}
                      </span>
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
                    <td className="px-4 py-3 text-right">
                      <CountToggle id={r.id} counted={isCounted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: cards */}
          <ul className="space-y-2 sm:hidden">
            {items.map(({ r, isCounted, num }) => (
              <li
                key={r.id}
                className={`rounded-xl border border-hair bg-surface p-4 ${
                  isCounted ? "" : "opacity-60"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {isCounted ? `#${num}` : "Fora da conta"}
                  </span>
                  <AttendedBadge attended={r.attended_first_edition} />
                </div>
                <p className="font-medium text-paper">
                  <span className={isCounted ? "" : "line-through"}>
                    {r.full_name}
                  </span>
                </p>
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
                <div className="mt-3 flex justify-end">
                  <CountToggle id={r.id} counted={isCounted} />
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
    <Card size="sm">
      <CardContent className="p-4 text-center">
        <span className={`block font-display text-3xl font-light tabular-nums ${color}`}>
          {value}
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}

function ConvidadoRow({ c }: { c: ConviteStatus }) {
  const accent =
    c.status === "opened_not_subscribed" ? "border-gold/50 bg-gold/5" : "border-hair bg-surface";
  const badge =
    c.status === "subscribed" ? (
      <Badge variant="live">Inscrito</Badge>
    ) : c.status === "opened_not_subscribed" ? (
      <Badge variant="gold">Abriu · não inscr.</Badge>
    ) : (
      <Badge variant="neutral">Não abriu</Badge>
    );

  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${accent}`}>
      <div className="min-w-0">
        <p className="font-medium text-paper">{c.name}</p>
        <p className="font-mono text-[11px] text-gray-mid">/convite/{c.slug}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        {badge}
        {c.opened && c.lastOpenedAt && (
          <span className="font-mono text-[10px] text-gray-mid">
            {c.openCount}× · {formatDateBR(c.lastOpenedAt, "dd/MM HH:mm")}
          </span>
        )}
      </div>
    </li>
  );
}

function AttendedBadge({ attended }: { attended: boolean }) {
  return attended ? (
    <Badge variant="gold">Veterano</Badge>
  ) : (
    <Badge variant="neutral">Estreante</Badge>
  );
}
