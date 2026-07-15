import { NextResponse } from "next/server";
import { rawServiceClient } from "@/lib/tournament/auth";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { buildWebhookDeps } from "@/lib/tickets/webhook-deps";

export async function POST(req: Request) {
  // Auth: o Asaas envia o token configurado no painel no header asaas-access-token.
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const result = await processWebhookEvent(payload, buildWebhookDeps(db, siteUrl));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[webhook] processWebhookEvent failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
