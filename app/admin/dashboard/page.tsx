import Link from "next/link";
import { getDashboard, getDashboardEventId, type Dashboard } from "@/lib/analytics/dashboard";
import { getAllSubscriptions } from "@/lib/tournament/subscriptions";
import { getConviteStatuses, type ConviteStatus } from "@/lib/tournament/convite-stats";
import { formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visita",
  section_ingressos: "Viu ingressos",
  ticket_cta_click: "Clicou garantir",
  plan_select: "Escolheu plano",
  checkout_start: "Começou checkout",
  order_created: "Gerou cobrança",
  order_failed: "Falha no pedido",
  paid: "Pagou",
  whatsapp_click: "Abriu WhatsApp",
  map_click: "Abriu mapa",
};

type Tab = "ingressos" | "inscricoes";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const tab: Tab = (await searchParams)?.tab === "inscricoes" ? "inscricoes" : "ingressos";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <LiveRefresh intervalMs={15000} />

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          PokerPi · Analytics
        </span>
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper sm:text-4xl">
          Painel
        </h1>
      </header>

      <Tabs active={tab} />

      {tab === "ingressos" ? <IngressosTab /> : <InscricoesTab />}
    </main>
  );
}

function Tabs({ active }: { active: Tab }) {
  const item = (key: Tab, label: string, sub: string) => {
    const on = active === key;
    return (
      <Link
        href={`/admin/dashboard?tab=${key}`}
        aria-current={on ? "page" : undefined}
        className={`flex-1 rounded-2xl border px-4 py-3 no-underline transition-colors ${
          on ? "border-gold/40 bg-gold/10 text-paper" : "border-line bg-ink-2 text-gray-soft hover:text-paper"
        }`}
      >
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-gray-mid">{sub}</span>
      </Link>
    );
  };
  return (
    <div className="flex gap-3">
      {item("ingressos", "Ingressos", "/pokerpi")}
      {item("inscricoes", "Inscrições", "/inscrever")}
    </div>
  );
}

// =========================================================================
// Aba INGRESSOS (/pokerpi)
// =========================================================================
async function IngressosTab() {
  const eventId = await getDashboardEventId();
  const data = eventId ? await getDashboard(eventId) : null;

  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-ink-2 px-6 py-12 text-center">
        <p className="text-sm text-gray-soft">Nenhum evento de ingressos pra mostrar ainda.</p>
      </div>
    );
  }

  return (
    <>
      <p className="font-mono text-xs text-gray-soft">
        {data.event.name}
        {data.event.startsAt ? ` · ${formatDateBR(data.event.startsAt, "dd/MM/yyyy")}` : ""}
        {data.event.salesOpen ? " · vendas abertas" : " · vendas fechadas"}
      </p>
      <DashboardBody data={data} />
    </>
  );
}

function DashboardBody({ data }: { data: Dashboard }) {
  const conversion = data.funnel[0]?.value
    ? Math.round((data.revenue.paidCount / data.funnel[0].value) * 100)
    : 0;

  return (
    <>
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Visitas" value={String(data.funnel[0]?.value ?? 0)} tone="paper" />
        <Stat label="Ingressos pagos" value={String(data.revenue.paidCount)} tone="felt" />
        <Stat label="Receita" value={brl(data.revenue.totalCents)} tone="gold" small />
        <Stat label="Ticket médio" value={brl(data.revenue.avgCents)} tone="paper" small />
      </section>

      {/* Funil */}
      <Panel title="Funil de conversão" hint={`${conversion}% das visitas viram ingresso pago`}>
        <div className="space-y-2.5">
          {data.funnel.map((s) => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-paper">{s.label}</span>
                <span className="font-mono text-xs text-gray-soft tabular-nums">
                  {s.value}
                  <span className="ml-2 text-gray-mid">{s.pctOfTop}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-2">
                <div
                  className="h-full rounded-full bg-gold/80"
                  style={{ width: `${Math.max(s.pctOfTop, s.value > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Por plano */}
      <Panel title="Por plano">
        {data.byPlan.length === 0 ? (
          <Empty>Nenhuma venda ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {data.byPlan.map((p) => (
              <li key={p.name} className="flex items-center justify-between rounded-xl border border-hair bg-surface px-4 py-3">
                <div>
                  <p className="font-medium text-paper">{p.name}</p>
                  <p className="font-mono text-[11px] text-gray-mid">
                    {p.paid} pago{p.paid === 1 ? "" : "s"}
                    {p.pending > 0 ? ` · ${p.pending} pendente${p.pending === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <span className="font-display text-lg font-light tabular-nums text-gold">{brl(p.revenueCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Por origem */}
      <Panel title="Por origem" hint="atribuição via ?ref / utm">
        {data.bySource.length === 0 ? (
          <Empty>Sem dados de origem ainda.</Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-mid">
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-3 py-2.5 text-right font-medium">Visitas</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pedidos</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pagos</th>
                  <th className="px-4 py-2.5 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.bySource.map((s) => (
                  <tr key={s.source} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-paper">{s.source}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-gray-soft">{s.visits || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-gray-soft">{s.orders || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-paper">{s.paid || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-gold">{s.revenueCents ? brl(s.revenueCents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Dispositivos + Referrers */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Panel title="Dispositivos">
          {data.devices.length === 0 ? <Empty>Sem visitas ainda.</Empty> : <BarList rows={data.devices} />}
        </Panel>
        <Panel title="De onde vieram">
          {data.referrers.length === 0 ? <Empty>Sem visitas ainda.</Empty> : <BarList rows={data.referrers} />}
        </Panel>
      </section>

      {/* No-show + presença */}
      <Panel title="Presença no evento" hint="pagos x check-in feito">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Pagaram" value={String(data.noShow.paid)} tone="paper" />
          <Stat label="Check-in" value={String(data.noShow.checkedIn)} tone="felt" />
          <Stat label="No-show" value={String(Math.max(0, data.noShow.paid - data.noShow.checkedIn))} tone="gold" />
        </div>
      </Panel>

      {/* Série diária */}
      {data.daily.length > 0 && (
        <Panel title="Últimos dias">
          <ul className="space-y-1.5">
            {data.daily.map((d) => (
              <li key={d.day} className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-[11px] text-gray-mid">{d.day.slice(5)}</span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-ink-2">
                  <div className="h-full bg-paper/30" style={{ width: `${Math.min(100, d.views * 4)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-[11px] text-gray-soft tabular-nums">
                  {d.views} vis · {d.paid} pg
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Eventos recentes */}
      <Panel title="Atividade recente">
        {data.recent.length === 0 ? (
          <Empty>Nada ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line/60">
            {data.recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant={r.name === "paid" ? "live" : r.name === "order_created" ? "gold" : "neutral"}>
                    {EVENT_LABELS[r.name] ?? r.name}
                  </Badge>
                  {r.plan && <span className="text-xs text-gray-soft">{r.plan}</span>}
                  {r.ref && <span className="font-mono text-[11px] text-gray-mid">via {r.ref}</span>}
                </div>
                <span className="shrink-0 font-mono text-[10px] text-gray-mid">
                  {formatDateBR(r.at, "dd/MM HH:mm")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// =========================================================================
// Aba INSCRIÇÕES (/inscrever)
// =========================================================================
async function InscricoesTab() {
  const [subs, convites] = await Promise.all([getAllSubscriptions(), getConviteStatuses()]);

  return (
    <>
      <p className="font-mono text-xs text-gray-soft">Inscrições do /inscrever e aberturas dos convites personalizados.</p>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Inscritos" value={String(subs.count)} tone="paper" />
        <Stat label="Foram à 1ª" value={String(subs.attendedCount)} tone="gold" />
        <Stat label="Primeira vez" value={String(subs.firstTimerCount)} tone="felt" />
      </section>

      <Panel
        title="Convidados"
        hint={`${convites.total} links${convites.openedNotSubscribedCount > 0 ? ` · ${convites.openedNotSubscribedCount} abriu e não inscreveu` : ""}`}
      >
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Stat label="Inscritos" value={String(convites.subscribedCount)} tone="felt" />
          <Stat label="Abriu, não inscr." value={String(convites.openedNotSubscribedCount)} tone="gold" />
          <Stat label="Não abriu" value={String(convites.notOpenedCount)} tone="paper" />
        </div>
        <ul className="space-y-2">
          {convites.rows.map((c) => (
            <ConvidadoRow key={c.slug} c={c} />
          ))}
        </ul>
      </Panel>

      <Link
        href="/admin/inscritos"
        className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm text-paper no-underline transition-colors hover:border-gold/40"
      >
        Ver lista completa de inscritos
      </Link>
    </>
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

// =========================================================================
// Compartilhados
// =========================================================================
function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-light tracking-tight text-paper">{title}</h2>
        {hint && <span className="font-mono text-[11px] text-gray-mid">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm capitalize text-paper">{r.name}</span>
            <span className="font-mono text-xs text-gray-soft tabular-nums">{r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-2">
            <div className="h-full rounded-full bg-felt" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-2 px-4 py-8 text-center">
      <p className="text-sm text-gray-soft">{children}</p>
    </div>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone: "paper" | "gold" | "felt"; small?: boolean }) {
  const color = tone === "gold" ? "text-gold" : tone === "felt" ? "text-felt" : "text-paper";
  return (
    <Card size="sm">
      <CardContent className="p-4 text-center">
        <span className={`block font-display ${small ? "text-xl" : "text-3xl"} font-light tabular-nums ${color}`}>
          {value}
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
