"use server";

import { requireAdmin, adminServiceClient } from "@/lib/tournament/auth";
import type { Tables } from "@/lib/types/database.types";

export type Subscription = Tables<"subscriptions">;

export type SubscriptionsSummary = {
  count: number;
  attendedCount: number;
  firstTimerCount: number;
  rows: Subscription[];
};

/**
 * Carrega todas as inscrições da landing pública. Admin-only — o service role
 * bypassa a RLS (que não tem policy de SELECT pública, então a lista de
 * inscritos é privada). Ordenada da mais recente pra mais antiga.
 */
export async function getAllSubscriptions(): Promise<SubscriptionsSummary> {
  await requireAdmin();
  const supabase = adminServiceClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar inscrições: ${error.message}`);
  }

  const rows = data ?? [];
  const attendedCount = rows.filter((r) => r.attended_first_edition).length;

  return {
    count: rows.length,
    attendedCount,
    firstTimerCount: rows.length - attendedCount,
    rows,
  };
}
