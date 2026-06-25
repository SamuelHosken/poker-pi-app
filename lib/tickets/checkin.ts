"use server";
import { nanoid } from "nanoid";
import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";

export async function checkInTicket(
  qrToken: string,
): Promise<
  | { ok: true; buyerName: string; ticketName: string; already: boolean }
  | { ok: false; error: string }
> {
  const { userId } = await requireAdmin();
  const db = rawServiceClient();

  const { data: ticket } = await db
    .from("tickets")
    .select(
      "id,status,buyer_name,checked_in_at,ticket_type_id,event_id,player_id",
    )
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status !== "paid")
    return { ok: false, error: "Ingresso não está pago." };

  const { data: tt } = await db
    .from("ticket_types")
    .select("name")
    .eq("id", ticket.ticket_type_id)
    .maybeSingle();
  const ticketName = tt?.name ?? "Ingresso";

  if (ticket.checked_in_at) {
    return { ok: true, buyerName: ticket.buyer_name, ticketName, already: true };
  }

  // Cria/liga o player no evento (estado PRESENTE)
  let playerId: string | null = ticket.player_id as string | null;
  if (!playerId) {
    const { data: player } = await db
      .from("players")
      .insert({
        event_id: ticket.event_id,
        name: ticket.buyer_name,
        player_token: nanoid(16),
        state: "PRESENTE",
        has_paid_buyin: true,
      })
      .select("id")
      .single();
    playerId = player?.id ?? null;
  }

  const { error: checkInError } = await db
    .from("tickets")
    .update({
      checked_in_at: new Date().toISOString(),
      checked_in_by: userId,
      player_id: playerId,
    })
    .eq("id", ticket.id);

  if (checkInError) {
    return { ok: false, error: "Falha ao registrar o check-in. Tente de novo." };
  }

  return { ok: true, buyerName: ticket.buyer_name, ticketName, already: false };
}
