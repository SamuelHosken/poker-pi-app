import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calculateTimeRemainingMs } from "@/lib/timer/calculate";
import type { Database, Tables } from "@/lib/types/database.types";

type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

/**
 * V1.3 — Tick público de auto-advance de blinds. Scanea todos os matches
 * de eventos com auto_advance_blinds=true; se cronômetro estourou + 2s
 * de carência, avança pro próximo nível.
 *
 * Por que público (sem auth): a ação é IDEMPOTENTE (só avança quando o
 * tempo realmente acabou) e usa o template do banco — não há vetor de
 * abuso. Permite ser disparado por:
 *   - Vercel cron (vercel.json) a cada minuto pra cobertura mínima
 *   - Página da TV pública via fetch a cada ~5s pra responsividade
 *   - Página config TV admin (que já tem a lógica client-side, mantida
 *     pra UX imediata quando admin está olhando)
 *
 * Throttle simples: usa o próprio `level_started_at` como dedup natural —
 * depois que advancou, o novo level_started_at não estará expirado.
 */
export async function GET() {
  return runTick();
}

export async function POST() {
  return runTick();
}

async function runTick() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { advanced: 0, error: "service role unavailable" },
      { status: 503 },
    );
  }

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // 1) Eventos com auto-advance ativo (e não encerrados / não deletados)
  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("auto_advance_blinds", true)
    .neq("state", "ENCERRADO")
    .is("deleted_at", null);

  const eventIds = (events ?? []).map((e) => e.id);
  if (eventIds.length === 0) {
    return NextResponse.json({ advanced: 0 });
  }

  // 2) Matches JOGANDO desses eventos
  const { data: matches } = await admin
    .from("matches")
    .select("*")
    .in("event_id", eventIds)
    .eq("state", "JOGANDO");

  const ms = (matches ?? []) as Match[];
  if (ms.length === 0) return NextResponse.json({ advanced: 0 });

  // 3) Pega níveis em lote (level atual + todos da mesa pra próximo)
  const levelIds = ms
    .map((m) => m.current_level_id)
    .filter((id): id is string => id !== null);
  const tableIds = ms.map((m) => m.physical_table_id);

  const [{ data: currentLevels }, { data: allTableLevels }] = await Promise.all([
    levelIds.length
      ? admin.from("blind_levels").select("*").in("id", levelIds)
      : Promise.resolve({ data: [] as BlindLevel[] }),
    tableIds.length
      ? admin.from("blind_levels").select("*").in("physical_table_id", tableIds)
      : Promise.resolve({ data: [] as BlindLevel[] }),
  ]);

  const curLvlById = new Map<string, BlindLevel>();
  for (const l of currentLevels ?? []) curLvlById.set(l.id, l);

  // Agrupa níveis por mesa pro lookup do próximo
  const lvlsByTable = new Map<string, BlindLevel[]>();
  for (const l of allTableLevels ?? []) {
    const arr = lvlsByTable.get(l.physical_table_id) ?? [];
    arr.push(l);
    lvlsByTable.set(l.physical_table_id, arr);
  }
  for (const arr of lvlsByTable.values()) {
    arr.sort((a, b) => a.level_number - b.level_number);
  }

  // 4) Pra cada match expirado por mais de 2s, avança 1 nível
  const GRACE_MS = 2000;
  let advanced = 0;
  for (const m of ms) {
    if (!m.current_level_id) continue;
    const cur = curLvlById.get(m.current_level_id);
    if (!cur) continue;

    const remaining = calculateTimeRemainingMs(m, cur);
    if (remaining > -GRACE_MS) continue; // ainda não expirou + carência

    const lvls = lvlsByTable.get(m.physical_table_id) ?? [];
    const idx = lvls.findIndex((l) => l.id === cur.id);
    const next = idx >= 0 ? lvls[idx + 1] : undefined;
    if (!next) continue; // já era o último nível

    const now = new Date().toISOString();
    await admin
      .from("matches")
      .update({
        current_level_id: next.id,
        level_started_at: now,
        total_paused_ms: 0,
        paused_at: null,
      })
      .eq("id", m.id)
      // Guarda atômica: só atualiza se a level ainda for a `cur` (evita
      // double-advance se 2 ticks bateram juntos).
      .eq("current_level_id", cur.id);
    advanced++;
  }

  return NextResponse.json({ advanced });
}
