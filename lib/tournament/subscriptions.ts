"use server";

import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";
import type { Tables } from "@/lib/types/database.types";

// `counted` ainda não está nos tipos gerados (migration 0020) — anexamos aqui.
export type Subscription = Tables<"subscriptions"> & { counted: boolean };

export type SubscriptionsSummary = {
  /** Quantidade CONTABILIZADA (exclui os marcados como não contabilizar). */
  count: number;
  attendedCount: number;
  firstTimerCount: number;
  /** Quantos foram marcados como não contabilizar. */
  excludedCount: number;
  /** Todas as inscrições (inclui as não contabilizadas, pra exibir na lista). */
  rows: Subscription[];
};

/**
 * Carrega todas as inscrições da landing pública. Admin-only — service role
 * bypassa a RLS. Os números (count/attended/firstTimer) consideram só as
 * CONTABILIZADAS; a lista traz todas pra o admin poder (re)contabilizar.
 */
export async function getAllSubscriptions(): Promise<SubscriptionsSummary> {
  await requireAdmin();
  const supabase = rawServiceClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar inscrições: ${error.message}`);
  }

  const rows = (data ?? []) as Subscription[];
  // counted !== false → trata ausência da coluna (pré-migration) como contabilizado.
  const counted = rows.filter((r) => r.counted !== false);
  const attendedCount = counted.filter((r) => r.attended_first_edition).length;

  return {
    count: counted.length,
    attendedCount,
    firstTimerCount: counted.length - attendedCount,
    excludedCount: rows.length - counted.length,
    rows,
  };
}

/** Marca/desmarca uma inscrição como contabilizada. Admin-only. */
export async function setSubscriptionCounted(
  id: string,
  counted: boolean,
): Promise<void> {
  await requireAdmin();
  const db = rawServiceClient();
  const { error } = await db
    .from("subscriptions")
    .update({ counted })
    .eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar inscrição: ${error.message}`);
  }
}
