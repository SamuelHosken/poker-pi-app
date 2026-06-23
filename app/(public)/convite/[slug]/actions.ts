"use server";

import { headers } from "next/headers";
import { rawServiceClient } from "@/lib/tournament/auth";
import { getConvite } from "../../inscrever/convites";

/**
 * Registra que alguém ABRIU um link de convite. Chamada do navegador real
 * (via useEffect) — os robôs de preview do WhatsApp/Facebook não rodam JS,
 * então não contam como abertura. Best-effort: nunca quebra a página.
 */
export async function recordConviteOpen(slug: string): Promise<void> {
  // Só convites conhecidos — ignora slug inventado.
  if (!getConvite(slug)) return;

  try {
    const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
    const supabase = rawServiceClient();
    await supabase.from("convite_opens").insert({ slug, user_agent: ua });
  } catch {
    // rastreio é opcional — silencioso de propósito
  }
}
