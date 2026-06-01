"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, adminServiceClient } from "@/lib/tournament/auth";
import type { Tables } from "@/lib/types/database.types";

export type EventFeedback = Tables<"event_feedback">;

export type FeedbackSummary = {
  count: number;
  averages: {
    organizacao: number | null;
    torneio: number | null;
    jantar: number | null;
    bar: number | null;
    estrutura: number | null;
    geral: number | null;
  };
  suggestions: { id: string; text: string; createdAt: string }[];
  responses: EventFeedback[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/**
 * Carrega todas as avaliações (desacopladas de evento) + médias por categoria.
 * Admin-only (service role bypassa a RLS, que não tem policy de SELECT pública).
 */
export async function getAllFeedback(): Promise<FeedbackSummary> {
  await requireAdmin();
  const supabase = adminServiceClient();

  const { data, error } = await supabase
    .from("event_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar avaliações: ${error.message}`);

  const rows = data ?? [];

  const all = rows.flatMap((r) => [
    r.rating_organizacao,
    r.rating_torneio,
    r.rating_jantar,
    r.rating_bar,
    r.rating_estrutura,
  ]);

  return {
    count: rows.length,
    averages: {
      organizacao: avg(rows.map((r) => r.rating_organizacao)),
      torneio: avg(rows.map((r) => r.rating_torneio)),
      jantar: avg(rows.map((r) => r.rating_jantar)),
      bar: avg(rows.map((r) => r.rating_bar)),
      estrutura: avg(rows.map((r) => r.rating_estrutura)),
      geral: avg(all),
    },
    suggestions: rows
      .filter((r) => r.suggestion && r.suggestion.trim().length > 0)
      .map((r) => ({
        id: r.id,
        text: r.suggestion as string,
        createdAt: r.created_at,
      })),
    responses: rows,
  };
}

/**
 * Apaga TODAS as avaliações. Ação destrutiva e irreversível — admin-only.
 * Retorna quantas linhas foram removidas.
 */
export async function resetAllFeedback(): Promise<{ deleted: number }> {
  await requireAdmin();
  const supabase = adminServiceClient();

  const { data, error } = await supabase
    .from("event_feedback")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) throw new Error(`Erro ao resetar avaliações: ${error.message}`);

  revalidatePath("/admin/feedback");
  return { deleted: data?.length ?? 0 };
}
