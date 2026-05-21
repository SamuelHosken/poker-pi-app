import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isLevelExpired } from "@/lib/timer/calculate";
import type { Database } from "@/lib/types/database.types";

/**
 * Cron endpoint: avança o nível de blind de qualquer match em JOGANDO
 * cujo tempo expirou. Configurado em vercel.json para rodar a cada
 * minuto (granularidade mínima do plano Hobby).
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>`. O Vercel Cron
 * injeta isso automaticamente quando CRON_SECRET está nas env vars.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "supabase env vars missing" }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: matches, error: matchErr } = await supabase
    .from("matches")
    .select("*")
    .eq("state", "JOGANDO");

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  const advancedIds: string[] = [];

  for (const match of matches ?? []) {
    if (!match.current_level_id) continue;

    const { data: currentLevel } = await supabase
      .from("blind_levels")
      .select("*")
      .eq("id", match.current_level_id)
      .maybeSingle();
    if (!currentLevel) continue;

    if (!isLevelExpired(match, currentLevel)) continue;

    const { data: nextLevel } = await supabase
      .from("blind_levels")
      .select("*")
      .eq("event_id", match.event_id)
      .eq("is_final_table", currentLevel.is_final_table)
      .gt("level_number", currentLevel.level_number)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextLevel) continue; // último nível, mantém

    const { error: updErr } = await supabase
      .from("matches")
      .update({
        current_level_id: nextLevel.id,
        level_started_at: new Date().toISOString(),
        total_paused_ms: 0,
        paused_at: null,
      })
      .eq("id", match.id);

    if (!updErr) advancedIds.push(match.id);
  }

  return NextResponse.json({ advanced: advancedIds.length, matchIds: advancedIds });
}
