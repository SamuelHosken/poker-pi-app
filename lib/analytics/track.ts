"use server";

import { rawServiceClient } from "@/lib/tournament/auth";
import { SITE_EVENT_NAMES, type SiteEventName, type TrackInput } from "./types";

const ALLOWED = new Set<string>(SITE_EVENT_NAMES);

function clip(v: string | null | undefined, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

/**
 * Grava um evento do funil. Best-effort: NUNCA quebra a página/checkout. Pode
 * ser chamada do navegador (Server Action) ou do servidor (webhook, order).
 * Sem PII: só session_id anônimo + contexto.
 */
export async function trackEvent(input: TrackInput): Promise<void> {
  try {
    if (!ALLOWED.has(input.name)) return;
    const db = rawServiceClient();
    await db.from("site_events").insert({
      name: input.name as SiteEventName,
      session_id: clip(input.sessionId, 64),
      path: clip(input.path, 200),
      ref: clip(input.ref, 120),
      utm_source: clip(input.utmSource, 120),
      utm_medium: clip(input.utmMedium, 120),
      utm_campaign: clip(input.utmCampaign, 120),
      plan: clip(input.plan, 120),
      event_id: input.eventId ?? null,
      device: clip(input.device, 20),
      referrer: clip(input.referrer, 300),
      meta: input.meta ?? null,
    });
  } catch {
    // rastreio é opcional — silencioso de propósito
  }
}
