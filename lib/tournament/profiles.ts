"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/tournament/auth";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  type CreateProfileInput,
} from "@/lib/types/schemas";
import type { Database, Tables } from "@/lib/types/database.types";

type Profile = Tables<"profiles">;

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente no ambiente — necessário pra criar profiles.",
    );
  }
  return createServiceRoleClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * V1.2 — Cria perfil completo:
 *   1. auth.users (via Admin API com email_confirm=true e metadata)
 *   2. Profile é criado automaticamente via trigger handle_new_user
 *
 * Requer caller admin. Senha é definida no momento da criação; pessoa pode
 * trocar depois via Supabase auth (fora do escopo desta UI).
 */
export async function createProfile(
  input: CreateProfileInput,
): Promise<{ profileId: string }> {
  const data = CreateProfileSchema.parse(input);
  await requireAdmin();

  const admin = getServiceRoleClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      nickname: data.nickname ?? null,
      is_admin: data.isAdmin,
    },
  });

  if (error) {
    if (error.message.includes("already")) {
      throw new Error("Já existe um perfil com esse e-mail.");
    }
    throw new Error(`Erro ao criar perfil: ${error.message}`);
  }
  if (!created.user) throw new Error("Erro: usuário criado sem ID.");

  // Trigger handle_new_user já criou a row em profiles. Se isAdmin precisa
  // garantir (caso o trigger não tenha pego o metadata), forçamos via update.
  if (data.isAdmin) {
    await admin
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", created.user.id);
  }

  revalidatePath("/admin/profiles");
  return { profileId: created.user.id };
}

export async function listProfiles(): Promise<Profile[]> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Erro ao listar perfis: ${error.message}`);
  return data ?? [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao ler perfil: ${error.message}`);
  return data ?? null;
}

/**
 * Retorna o profile do user logado, ou null se não houver sessão.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Atualiza name/nickname/is_admin de um profile.
 * is_admin pode SÓ ser alterado por admin (validado via requireAdmin).
 */
export async function updateProfile(input: unknown): Promise<void> {
  const data = UpdateProfileSchema.parse(input);
  await requireAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const patch: Partial<Pick<Profile, "name" | "nickname" | "is_admin">> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.nickname !== undefined) patch.nickname = data.nickname;
  if (data.isAdmin !== undefined) patch.is_admin = data.isAdmin;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", data.id);
  if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`);

  revalidatePath("/admin/profiles");
}

/**
 * Toggle de is_admin via Server Action (atalho).
 */
export async function setAdminFlag(profileId: string, isAdmin: boolean): Promise<void> {
  await requireAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", profileId);
  if (error) throw new Error(`Erro ao alternar admin: ${error.message}`);

  revalidatePath("/admin/profiles");
}

/**
 * Deleta o perfil e o user de auth (cascateia pra profile).
 * Requer admin.
 */
export async function deleteProfile(profileId: string): Promise<void> {
  await requireAdmin();
  const admin = getServiceRoleClient();

  // Deleta o auth.user — ON DELETE CASCADE em profiles.id apaga o profile.
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) throw new Error(`Erro ao apagar perfil: ${error.message}`);

  revalidatePath("/admin/profiles");
}
