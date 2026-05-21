"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LoginSchema } from "@/lib/types/schemas";

export type LoginFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      error: error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : `Erro ao entrar: ${error.message}`,
    };
  }

  // V1.2: redirect baseado em is_admin do profile
  let destination = "/me";
  if (signInData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", signInData.user.id)
      .maybeSingle();
    if (profile?.is_admin) destination = "/admin/events";
  }

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/admin/login");
}
