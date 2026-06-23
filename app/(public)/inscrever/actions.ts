"use server";

import { cookies, headers } from "next/headers";
import { resolveMx } from "node:dns/promises";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import type { TablesInsert as Inserts } from "@/lib/types/database.types";
import {
  DISPOSABLE_EMAIL_DOMAINS,
  TRUSTED_EMAIL_DOMAINS,
} from "./email-domains";

// =========================================================================
// Verificação leve de e-mail (sintaxe + domínio MX + descartáveis)
// =========================================================================

export type EmailCheck =
  | { ok: true }
  | { ok: false; reason: string };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const mxCache = new Map<string, boolean>();

/** Resolve MX do domínio com timeout, com cache em memória por processo. */
async function domainHasMx(domain: string): Promise<boolean> {
  if (mxCache.has(domain)) return mxCache.get(domain)!;

  const lookup = (async () => {
    try {
      const records = await resolveMx(domain);
      return records.length > 0 && records.some((r) => r.exchange);
    } catch {
      return false;
    }
  })();

  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), 4000),
  );

  const has = await Promise.race([lookup, timeout]);
  mxCache.set(domain, has);
  return has;
}

/**
 * Verifica se um e-mail "existe" no nível possível sem API paga:
 *   1. Sintaxe válida
 *   2. Não é domínio descartável/temporário
 *   3. O domínio tem registro MX (servidor de e-mail) no DNS
 *
 * NÃO garante que a caixa específica existe (isso exigiria SMTP/serviço pago),
 * mas barra os casos mais comuns: domínio digitado errado e e-mail falso.
 */
export async function verifyEmail(raw: string): Promise<EmailCheck> {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "Formato de e-mail inválido." };
  }
  const email = parsed.data;
  const domain = email.split("@")[1];

  if (!domain) {
    return { ok: false, reason: "Formato de e-mail inválido." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      ok: false,
      reason: "Use um e-mail pessoal — descartáveis não são aceitos.",
    };
  }

  if (TRUSTED_EMAIL_DOMAINS.has(domain)) {
    return { ok: true };
  }

  const hasMx = await domainHasMx(domain);
  if (!hasMx) {
    return {
      ok: false,
      reason: "Não encontramos esse domínio de e-mail. Confira se digitou certo.",
    };
  }

  return { ok: true };
}

// =========================================================================
// Inscrição
// =========================================================================

const SubscriptionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Digite seu nome completo.")
    .max(120, "Nome muito longo."),
  email: emailSchema,
  // Telefone já montado em E.164 no cliente (ex.: +5561999998888).
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,17}$/, "Número de telefone inválido."),
  phoneCountry: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .optional(),
  attendedFirstEdition: z.boolean(),
  // De qual link de convite a inscrição veio (slug). Ausente no /inscrever.
  conviteSlug: z.string().trim().max(40).optional(),
});

export type SubscriptionInput = z.input<typeof SubscriptionSchema>;

export type SubscriptionResult =
  | { ok: true }
  | { ok: false; error: string; field?: keyof SubscriptionInput };

/**
 * Registra uma inscrição na nova edição. Público (sem auth): o INSERT passa
 * pelo cliente cookie (role anon) e é validado pela RLS
 * `subscriptions_insert_public`. Reverifica o e-mail no servidor antes de
 * gravar (defesa em profundidade — o cliente já checou no blur).
 */
export async function submitSubscription(
  input: SubscriptionInput,
): Promise<SubscriptionResult> {
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Confira os dados e tente novamente.",
      field: first?.path[0] as keyof SubscriptionInput | undefined,
    };
  }
  const data = parsed.data;

  // Rate limit por IP: até 5 inscrições a cada 10 min (anti-spam básico).
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "anon";
    checkRateLimit(`subscribe:${ip}`, 5, 10 * 60_000);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Tente novamente em instantes.",
    };
  }

  // Reverifica o e-mail no servidor (cliente pode ter sido burlado).
  const emailCheck = await verifyEmail(data.email);
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.reason, field: "email" };
  }

  const supabase = createClient(await cookies());

  // convite_slug pode ainda não existir como coluna (migration 0019). Por isso
  // o insert tenta COM a coluna e, se o schema não a conhece (PGRST204), repete
  // SEM ela — a inscrição nunca quebra por causa do rastreio.
  const row = {
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    phone_country: data.phoneCountry ?? null,
    attended_first_edition: data.attendedFirstEdition,
    convite_slug: data.conviteSlug ?? null,
  };

  let { error } = await supabase
    .from("subscriptions")
    .insert(row as Inserts<"subscriptions">);

  if (error?.code === "PGRST204") {
    const fallback = { ...row } as Record<string, unknown>;
    delete fallback.convite_slug;
    ({ error } = await supabase
      .from("subscriptions")
      .insert(fallback as Inserts<"subscriptions">));
  }

  if (error) {
    // 23505 = unique_violation no índice de e-mail.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Esse e-mail já está inscrito. Te esperamos no evento. ♠",
        field: "email",
      };
    }
    return {
      ok: false,
      error: "Não foi possível concluir sua inscrição. Tente novamente.",
    };
  }

  return { ok: true };
}
