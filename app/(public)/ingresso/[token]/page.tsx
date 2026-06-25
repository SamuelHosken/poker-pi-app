import { notFound } from "next/navigation";
import { rawServiceClient } from "@/lib/tournament/auth";
import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { TicketQr } from "./ticket-qr";

export const dynamic = "force-dynamic";

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = rawServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id,status,buyer_name,ticket_type_id,event_id,qr_token,checked_in_at")
    .eq("qr_token", token)
    .maybeSingle();
  if (!ticket) notFound();

  const { data: tt } = await db.from("ticket_types").select("name").eq("id", ticket.ticket_type_id).maybeSingle();
  const { data: ev } = await db.from("events").select("name,starts_at,location_text").eq("id", ticket.event_id).maybeSingle();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const planName = tt?.name ?? "Ingresso";
  const isOpenBar = /open\s*bar/i.test(planName);
  const checkedIn = !!ticket.checked_in_at;
  const startsAt = ev?.starts_at ? new Date(ev.starts_at) : null;
  const rawDate = startsAt
    ? startsAt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", weekday: "long", timeZone: "America/Sao_Paulo" })
    : "";
  const dateText = rawDate ? rawDate.charAt(0).toUpperCase() + rawDate.slice(1) : "";
  const timeText = startsAt
    ? startsAt
        .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
        .replace(":00", "h")
        .replace(":", "h")
    : "";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      {/* brilho dourado de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh]"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(217,184,118,0.16), rgba(10,10,12,0) 70%)" }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center px-5 py-10">
        {/* marca */}
        <div className="flex flex-col items-center">
          <PokerPiLogo className="h-12 w-12 text-gold" />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">Seu ingresso</p>
        </div>

        {/* status */}
        <div
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${
            checkedIn ? "bg-live/15 text-live" : "bg-gold/15 text-gold"
          }`}
        >
          <span className="text-base leading-none">{checkedIn ? "✓" : "●"}</span>
          {checkedIn ? "Check-in realizado" : "Confirmado · Pago"}
        </div>

        {/* QR */}
        <div className="mt-7">
          <TicketQr value={`${siteUrl}/ingresso/${ticket.qr_token}`} />
        </div>

        {/* card de dados */}
        <div className="mt-7 w-full rounded-3xl border border-line bg-ink-2/70 p-6 backdrop-blur-sm">
          <h1 className="text-center text-2xl font-bold tracking-tight text-paper">{ev?.name}</h1>

          <div className="my-5 flex justify-center">
            <span
              className={
                isOpenBar
                  ? "inline-flex items-center gap-2 rounded-full bg-gold px-5 py-1.5 text-sm font-extrabold uppercase tracking-wide text-ink"
                  : "inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-1.5 text-sm font-bold uppercase tracking-wide text-gold"
              }
            >
              {isOpenBar ? "🥃 Open Bar" : planName}
            </span>
          </div>

          <dl className="divide-y divide-line/70">
            <Row label="Nome" value={ticket.buyer_name ?? ""} />
            <Row label="Data" value={dateText} />
            <Row label="Horário" value={timeText} />
            <Row label="Local" value={ev?.location_text ?? ""} />
          </dl>
        </div>

        <p className="mt-6 max-w-xs text-center text-xs leading-relaxed text-gray-soft">
          Apresente este QR Code na entrada. Salve um print por garantia. Ele é o seu ingresso.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-medium text-paper">{value}</dd>
    </div>
  );
}
