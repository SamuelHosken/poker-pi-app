import { rawServiceClient, requireAdmin } from "@/lib/tournament/auth";

// Agregações do painel de analytics. Tudo server-side (service role). A escala é
// pequena (evento entre amigos), então buscar as linhas e agregar em JS é ok.

export type FunnelStage = { key: string; label: string; value: number; pctOfTop: number; pctOfPrev: number };
export type PlanRow = { name: string; paid: number; pending: number; revenueCents: number };
export type SourceRow = { source: string; visits: number; orders: number; paid: number; revenueCents: number };
export type NameValue = { name: string; value: number };
export type DayRow = { day: string; views: number; paid: number };
export type RecentRow = { name: string; plan: string | null; ref: string | null; device: string | null; at: string };

export type Dashboard = {
  event: { id: string; name: string; startsAt: string | null; capacity: number | null; salesOpen: boolean };
  funnel: FunnelStage[];
  revenue: { totalCents: number; paidCount: number; avgCents: number };
  byPlan: PlanRow[];
  bySource: SourceRow[];
  devices: NameValue[];
  referrers: NameValue[];
  noShow: { paid: number; checkedIn: number };
  daily: DayRow[];
  recent: RecentRow[];
};

type TicketRow = {
  status: string;
  amount_cents: number;
  ticket_type_id: string;
  source: string | null;
  paid_at: string | null;
  checked_in_at: string | null;
  created_at: string;
};

type EventRow = {
  name: string;
  session_id: string | null;
  plan: string | null;
  ref: string | null;
  device: string | null;
  referrer: string | null;
  created_at: string;
};

/** O evento que o painel mostra: o que está com vendas abertas, senão o mais recente. */
export async function getDashboardEventId(): Promise<string | null> {
  await requireAdmin();
  const db = rawServiceClient();
  const open = await db
    .from("events")
    .select("id")
    .eq("sales_open", true)
    .not("slug", "is", null)
    .order("starts_at", { ascending: true })
    .limit(1);
  if (open.data?.[0]) return open.data[0].id;
  const recent = await db
    .from("events")
    .select("id")
    .not("slug", "is", null)
    .order("starts_at", { ascending: false })
    .limit(1);
  return recent.data?.[0]?.id ?? null;
}

function host(url: string | null): string {
  if (!url) return "Direto";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Direto";
  }
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export async function getDashboard(eventId: string): Promise<Dashboard | null> {
  await requireAdmin();
  const db = rawServiceClient();

  const { data: ev } = await db
    .from("events")
    .select("id,name,starts_at,capacity,sales_open")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return null;

  const [{ data: ttData }, { data: ticketData }, { data: evData }] = await Promise.all([
    db.from("ticket_types").select("id,name").eq("event_id", eventId),
    db
      .from("tickets")
      .select("status,amount_cents,ticket_type_id,source,paid_at,checked_in_at,created_at")
      .eq("event_id", eventId),
    db
      .from("site_events")
      .select("name,session_id,plan,ref,device,referrer,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const ttName = new Map<string, string>((ttData ?? []).map((t) => [t.id as string, t.name as string]));
  const tickets = (ticketData ?? []) as TicketRow[];
  const events = (evData ?? []) as EventRow[];

  // ---- Funil (sessões únicas por etapa do site + pedidos pelos tickets) -----
  const distinct = (name: string) =>
    new Set(events.filter((e) => e.name === name && e.session_id).map((e) => e.session_id)).size;

  const views = distinct("page_view");
  const reached = distinct("section_ingressos");
  const cta = distinct("ticket_cta_click");
  const planSel = distinct("plan_select");
  const checkout = distinct("checkout_start");
  const ordersCreated = tickets.filter((t) => t.status === "pending" || t.status === "paid").length;
  const paidCount = tickets.filter((t) => t.status === "paid").length;

  const rawFunnel: { key: string; label: string; value: number }[] = [
    { key: "view", label: "Visitas", value: views },
    { key: "reached", label: "Viu os ingressos", value: reached },
    { key: "cta", label: "Clicou em garantir", value: cta },
    { key: "plan", label: "Escolheu plano", value: planSel },
    { key: "checkout", label: "Começou checkout", value: checkout },
    { key: "order", label: "Gerou cobrança", value: ordersCreated },
    { key: "paid", label: "Pagou", value: paidCount },
  ];
  const top = rawFunnel[0]?.value ?? 0;
  const funnel: FunnelStage[] = rawFunnel.map((s, i) => {
    const prev = rawFunnel[i - 1];
    return {
      ...s,
      pctOfTop: pct(s.value, top),
      pctOfPrev: prev ? pct(s.value, prev.value) : 100,
    };
  });

  // ---- Receita -------------------------------------------------------------
  const totalCents = tickets.filter((t) => t.status === "paid").reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  const revenue = { totalCents, paidCount, avgCents: paidCount > 0 ? Math.round(totalCents / paidCount) : 0 };

  // ---- Por plano -----------------------------------------------------------
  const planMap = new Map<string, PlanRow>();
  for (const t of tickets) {
    const name = ttName.get(t.ticket_type_id) ?? "Outro";
    const row = planMap.get(name) ?? { name, paid: 0, pending: 0, revenueCents: 0 };
    if (t.status === "paid") {
      row.paid += 1;
      row.revenueCents += t.amount_cents ?? 0;
    } else if (t.status === "pending") {
      row.pending += 1;
    }
    planMap.set(name, row);
  }
  const byPlan = [...planMap.values()].sort((a, b) => b.paid - a.paid);

  // ---- Por origem (atribuição da LP): visitas (?ref/utm) + pedidos/pagos -----
  const srcMap = new Map<string, SourceRow>();
  const keyFor = (s: string | null) => (s && s.trim() ? s.trim() : "Direto / sem origem");
  // visitas únicas por origem (sessões distintas com aquele ref entre os page_view)
  const visitSessions = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.name !== "page_view") continue;
    const k = keyFor(e.ref);
    if (!visitSessions.has(k)) visitSessions.set(k, new Set());
    if (e.session_id) visitSessions.get(k)!.add(e.session_id);
  }
  for (const [k, set] of visitSessions) {
    srcMap.set(k, { source: k, visits: set.size, orders: 0, paid: 0, revenueCents: 0 });
  }
  for (const t of tickets) {
    const k = keyFor(t.source);
    const row = srcMap.get(k) ?? { source: k, visits: 0, orders: 0, paid: 0, revenueCents: 0 };
    if (t.status === "pending" || t.status === "paid") row.orders += 1;
    if (t.status === "paid") {
      row.paid += 1;
      row.revenueCents += t.amount_cents ?? 0;
    }
    srcMap.set(k, row);
  }
  const bySource = [...srcMap.values()].sort((a, b) => b.paid - a.paid || b.visits - a.visits);

  // ---- Dispositivos (sessões únicas por device, entre as visitas) ----------
  const devMap = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.name !== "page_view") continue;
    const d = e.device ?? "desconhecido";
    if (!devMap.has(d)) devMap.set(d, new Set());
    if (e.session_id) devMap.get(d)!.add(e.session_id);
  }
  const devices = [...devMap.entries()]
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value);

  // ---- Referrers (de onde vieram as visitas) -------------------------------
  const refMap = new Map<string, number>();
  for (const e of events) {
    if (e.name !== "page_view") continue;
    const h = host(e.referrer);
    refMap.set(h, (refMap.get(h) ?? 0) + 1);
  }
  const referrers = [...refMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ---- No-show -------------------------------------------------------------
  const checkedIn = tickets.filter((t) => t.checked_in_at).length;
  const noShow = { paid: paidCount, checkedIn };

  // ---- Série diária (últimos 14 dias): visitas + pagos ---------------------
  const dayMap = new Map<string, { views: number; paid: number }>();
  const dayKey = (iso: string) => iso.slice(0, 10);
  for (const e of events) {
    if (e.name !== "page_view") continue;
    const k = dayKey(e.created_at);
    const r = dayMap.get(k) ?? { views: 0, paid: 0 };
    r.views += 1;
    dayMap.set(k, r);
  }
  for (const t of tickets) {
    if (t.status !== "paid" || !t.paid_at) continue;
    const k = dayKey(t.paid_at);
    const r = dayMap.get(k) ?? { views: 0, paid: 0 };
    r.paid += 1;
    dayMap.set(k, r);
  }
  const daily = [...dayMap.entries()]
    .map(([day, v]) => ({ day, views: v.views, paid: v.paid }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .slice(-14);

  // ---- Eventos recentes ----------------------------------------------------
  const recent: RecentRow[] = events.slice(0, 30).map((e) => ({
    name: e.name,
    plan: e.plan,
    ref: e.ref,
    device: e.device,
    at: e.created_at,
  }));

  return {
    event: {
      id: ev.id as string,
      name: ev.name as string,
      startsAt: (ev.starts_at as string) ?? null,
      capacity: (ev.capacity as number) ?? null,
      salesOpen: Boolean(ev.sales_open),
    },
    funnel,
    revenue,
    byPlan,
    bySource,
    devices,
    referrers,
    noShow,
    daily,
    recent,
  };
}
