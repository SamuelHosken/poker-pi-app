import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Garante que há um usuário admin autenticado. Lança erro se não houver.
 * Centraliza o gate de auth usado por todas as Server Actions admin.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Você precisa estar autenticado.");
  return { userId: user.id };
}
