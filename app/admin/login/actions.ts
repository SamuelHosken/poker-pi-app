"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LoginSchema } from "@/lib/types/schemas";

export type LoginFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export type ForgotFormState =
  | { ok: true; email: string }
  | { ok: false; error: string }
  | null;

export type ResetFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * V1.3 — Envia email com link de reset. Supabase manda email usando
 * o template configurado (Studio → Auth → Email Templates → Reset).
 * O link traz token; usuário cai em /admin/reset-password.
 */
export async function forgotPasswordAction(
  _prev: ForgotFormState,
  formData: FormData,
): Promise<ForgotFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail inválido." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const redirectTo = host ? `${proto}://${host}/admin/reset-password` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    // Por segurança, não exponha "email não existe" — sempre diga que enviou.
    // Apenas erros de transporte (rate limit, etc) viram mensagem real.
    if (error.message.toLowerCase().includes("rate")) {
      return { ok: false, error: "Muitas tentativas. Aguarde um pouco." };
    }
  }
  return { ok: true, email };
}

/**
 * V1.3 — Atualiza a senha do user logado (chamado depois que o link do
 * email faz o set da sessão temporária).
 */
export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { ok: false, error: "Senha precisa ter pelo menos 6 caracteres." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { ok: false, error: "Sessão inválida. Solicite um novo link." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: `Erro ao trocar senha: ${error.message}` };
  }
  return { ok: true };
}

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
