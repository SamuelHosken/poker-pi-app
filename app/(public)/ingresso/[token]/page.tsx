import { notFound } from "next/navigation";
import { rawServiceClient } from "@/lib/tournament/auth";
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
  const whenText = ev?.starts_at
    ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
    : "";

  return (
    <main className="min-h-dvh bg-ink text-paper flex flex-col items-center justify-center px-5 py-12">
      <div className="text-gold text-4xl font-bold">π</div>
      <h1 className="mt-2 text-xl font-semibold text-gold">{ev?.name}</h1>
      <p className="mt-1 text-sm text-gray-soft">{whenText}</p>

      <div className="mt-6">
        <TicketQr value={`${siteUrl}/ingresso/${ticket.qr_token}`} />
      </div>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-5">
        <Row label="Nome" value={ticket.buyer_name} />
        <Row label="Ingresso" value={tt?.name ?? "—"} gold />
        <Row label="Local" value={ev?.location_text ?? "—"} />
        <Row label="Status" value={ticket.checked_in_at ? "Check-in feito ✓" : "Pago ✓"} />
      </div>
      <p className="mt-4 text-xs text-gray-soft text-center max-w-xs">
        Apresente este QR Code na entrada. Salve um print por garantia.
      </p>
    </main>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-soft">{label}</span>
      <span className={gold ? "text-gold font-semibold" : "text-paper"}>{value}</span>
    </div>
  );
}
