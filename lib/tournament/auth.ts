import { cache } from "react";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/lib/types/database.types";

/**
 * Lê apenas o ID do usuário logado do cookie da sessão — SEM round-trip ao
 * Supabase. `getSession()` valida apenas o cookie assinado localmente; serve
 * pra identidade. Cacheado per-request via React.cache (deduplica chamadas
 * dentro da mesma renderização).
 *
 * Use em vez de `supabase.auth.getUser()` (que faz um GET /auth/v1/user
 * a cada chamada — ~100-200ms de latência por server action).
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
});

/**
 * Helper interno: cria client com service_role.
 * Usado APENAS pra ler profiles depois de validar user.id via auth.getUser().
 * Bypassa RLS (que estava bloqueando esses lookups em alguns paths de SSR).
 */
function profileLookupClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * V1.2 — Garante que há um usuário admin autenticado (profile.is_admin = true).
 * Centraliza o gate de auth usado por todas as Server Actions admin.
 *
 * Anteriormente checava só auth.getUser() (qualquer logado era admin).
 * Agora exige flag is_admin no profile.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar autenticado.");

  const admin = profileLookupClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao verificar perfil: ${error.message}`);
  if (!profile) throw new Error("Perfil não encontrado pra este usuário.");
  if (!profile.is_admin) throw new Error("Acesso restrito a administradores.");

  return { userId };
}

/**
 * V1.2 — Versão "soft": retorna user/profile sem lançar (pra UIs que decidem
 * destino baseado em estado).
 *
 * V1.3 — Cacheado via React.cache: várias chamadas dentro do mesmo render
 * (ex.: layout + page do mesmo segmento) deduplicam pra 1 lookup só.
 */
export const getCurrentUserAndProfile = cache(async (): Promise<{
  userId: string | null;
  isAdmin: boolean;
}> => {
  const userId = await getCurrentUserId();
  if (!userId) return { userId: null, isAdmin: false };

  const admin = profileLookupClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return { userId, isAdmin: profile?.is_admin ?? false };
});
