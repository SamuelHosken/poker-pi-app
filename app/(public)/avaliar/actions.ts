"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import type { TablesInsert as Inserts } from "@/lib/types/database.types";

const rating = z.coerce.number().int().min(0).max(10);

const FeedbackSchema = z.object({
  ratingOrganizacao: rating,
  ratingTorneio: rating,
  ratingJantar: rating,
  ratingBar: rating,
  ratingEstrutura: rating,
  suggestion: z.string().trim().max(2000).optional(),
});

export type FeedbackInput = z.input<typeof FeedbackSchema>;

/**
 * Envia uma avaliação pós-evento. Público (sem auth) e desacoplada de evento
 * — o INSERT passa pelo cliente cookie (role anon) e é validado pela RLS
 * `event_feedback_insert_public`.
 */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = FeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Confira as notas e tente novamente." };
  }
  const data = parsed.data;

  // Rate limit por IP: até 5 envios a cada 10 min (anti-spam básico).
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "anon";
    checkRateLimit(`feedback:${ip}`, 5, 10 * 60_000);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Tente novamente em instantes.",
    };
  }

  const supabase = createClient(await cookies());

  const row: Inserts<"event_feedback"> = {
    event_id: null,
    rating_organizacao: data.ratingOrganizacao,
    rating_torneio: data.ratingTorneio,
    rating_jantar: data.ratingJantar,
    rating_bar: data.ratingBar,
    rating_estrutura: data.ratingEstrutura,
    suggestion: data.suggestion?.length ? data.suggestion : null,
  };

  const { error } = await supabase.from("event_feedback").insert(row);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível enviar sua avaliação. Tente novamente.",
    };
  }

  return { ok: true };
}
