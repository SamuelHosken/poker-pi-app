import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * V1.2 — Garante que há um usuário admin autenticado (profile.is_admin = true).
 * Centraliza o gate de auth usado por todas as Server Actions admin.
 *
 * Anteriormente checava só auth.getUser() (qualquer logado era admin).
 * Agora exige flag is_admin no profile.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Você precisa estar autenticado.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao verificar perfil: ${error.message}`);
  if (!profile) throw new Error("Perfil não encontrado pra este usuário.");
  if (!profile.is_admin) throw new Error("Acesso restrito a administradores.");

  return { userId: user.id };
}

/**
 * V1.2 — Versão "soft": retorna user/profile sem lançar (pra UIs que decidem
 * destino baseado em estado).
 */
export async function getCurrentUserAndProfile(): Promise<{
  userId: string | null;
  isAdmin: boolean;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return { userId: user.id, isAdmin: profile?.is_admin ?? false };
}
