import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";

export const dynamic = "force-dynamic";

export default async function IngressosAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = rawServiceClient();
  const { data: rows } = await db
    .from("tickets")
    .select(
      "buyer_name,buyer_email,amount_cents,status,payment_method,checked_in_at,created_at,ticket_type_id",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  // Fetch ticket_types so we can show plan name (Open Bar vs Padrão)
  const { data: ttRows } = await db
    .from("ticket_types")
    .select("id,name")
    .eq("event_id", id);
  const ticketTypeMap: Record<string, string> = {};
  for (const tt of ttRows ?? []) {
    ticketTypeMap[tt.id as string] = tt.name as string;
  }

  const tickets = rows ?? [];
  const paid = tickets.filter((t) => t.status === "paid");

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-xl font-bold text-gold">Ingressos</h1>
      <p className="mt-1 text-sm text-gray-soft">
        {paid.length} pagos · {tickets.filter((t) => t.checked_in_at).length} presentes
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-ink-2 text-gray-soft">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Plano</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-center">Presença</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t, i) => (
              <tr key={i} className="border-t border-line">
                <td className="p-3">
                  {t.buyer_name}
                  <div className="text-xs text-gray-soft">{t.buyer_email}</div>
                </td>
                <td className="p-3 text-gray-soft">
                  {ticketTypeMap[t.ticket_type_id as string] ?? "—"}
                </td>
                <td className="p-3">{t.status}</td>
                <td className="p-3 text-right">
                  R$ {((t.amount_cents as number) / 100).toFixed(2).replace(".", ",")}
                </td>
                <td className="p-3 text-center">{t.checked_in_at ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
