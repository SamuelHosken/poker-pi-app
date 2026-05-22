"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin, getCurrentUserId } from "@/lib/tournament/auth";
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
 *
 * Usa service_role pra ler profile pois RLS pode bloquear em alguns paths
 * de SSR (auth.uid() retorna null se cookies não propagam). Como só lemos
 * a row do próprio user.id validado, é seguro.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Usa service role pra bypassar RLS — só lemos o próprio profile (id validado)
  const admin = getServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;
}

/**
 * V1.3 — Upload de avatar pro Supabase Storage + atualiza profile.
 * Caller já validou identidade via cookie; service_role faz o upload.
 * Esperamos blob já comprimido pelo client (max ~500KB, 256x256).
 */
const AVATAR_MAX_BYTES = 524288; // 512KB
const AVATAR_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAvatar(formData: FormData): Promise<{ url: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Arquivo inválido.");
  if (file.size === 0) throw new Error("Arquivo vazio.");
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Arquivo muito grande (máximo 512KB).");
  }
  if (!AVATAR_ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipo não permitido. Use JPEG, PNG ou WebP.");
  }

  const admin = getServiceRoleClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0", // sempre revalida no client; cache busting via ?v=
    });
  if (upErr) throw new Error(`Erro no upload: ${upErr.message}`);

  // Apaga arquivos antigos com outras extensões (caso troque jpg → png etc)
  const otherExts = ["jpg", "png", "webp"].filter((e) => e !== ext);
  for (const e of otherExts) {
    await admin.storage.from("avatars").remove([`${userId}/avatar.${e}`]);
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: pErr } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);
  if (pErr) throw new Error(`Erro ao salvar URL no perfil: ${pErr.message}`);

  revalidatePath("/me");
  revalidatePath("/me/perfil");
  return { url };
}

/**
 * V1.3 — Admin troca a senha de outro perfil (substitui o reset-password
 * enquanto não tem fluxo completo de e-mail). Útil quando player esquece.
 */
export async function adminUpdatePassword(input: {
  profileId: string;
  newPassword: string;
}): Promise<void> {
  await requireAdmin();
  const password = input.newPassword.trim();
  if (password.length < 6) {
    throw new Error("Senha precisa ter pelo menos 6 caracteres.");
  }
  const admin = getServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(input.profileId, {
    password,
  });
  if (error) throw new Error(`Erro ao trocar senha: ${error.message}`);
}

export async function removeAvatar(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Você precisa estar logado.");

  const admin = getServiceRoleClient();
  // Apaga todas as variações
  await admin.storage.from("avatars").remove([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
  ]);
  await admin.from("profiles").update({ avatar_url: null }).eq("id", userId);

  revalidatePath("/me");
  revalidatePath("/me/perfil");
}

/**
 * V1.3 — Retorna profile + email + histórico + stats agregadas.
 */
export type MyHistoryItem = {
  playerId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventState: string;
  playerState: string;
  finalPosition: number | null;
  rebuysUsed: number;
  // Tempo em mesa nesse evento (em segundos). null se ainda jogando ou nunca
  // sentou.
  timeAtTablesSeconds: number | null;
};

export type ChipDisplaySummary = {
  amount: number;
  createdAt: string;
  eventName: string;
};

export type RivalryEntry = {
  name: string;
  nickname: string | null;
  count: number;
};

export type ProfileStats = {
  totalEvents: number;
  champCount: number;
  podiumCount: number;
  bestPosition: number | null;
  avgPosition: number | null;
  totalSpentCents: number;
  totalTableTimeSeconds: number;
  // Chip displays
  chipDisplayCount: number;
  maxChipsShown: number | null;
  totalChipsShown: number;
  recentChipDisplays: ChipDisplaySummary[];
  // Rivalidades (V1.3)
  eliminationsCaused: number;
  eliminationsSuffered: number;
  topVictim: RivalryEntry | null;
  topNemesis: RivalryEntry | null;
};

export type MyProfileWithHistory = {
  profile: Profile;
  email: string | null;
  history: MyHistoryItem[];
  stats: ProfileStats;
};

const PODIUM_STATES = new Set(["CAMPEAO", "VICE", "TERCEIRO"]);

export async function getMyProfileWithHistory(): Promise<MyProfileWithHistory | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const admin = getServiceRoleClient();

  // Fase 1: profile + email + players (foundation)
  const [{ data: profile }, { data: authData }, { data: players }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    admin
      .from("players")
      .select("id, event_id, state, final_position, rebuys_used")
      .eq("profile_id", userId),
  ]);

  if (!profile) return null;

  const eventIds = Array.from(new Set((players ?? []).map((p) => p.event_id)));
  const playerIds = (players ?? []).map((p) => p.id);

  // Fase 2: events + participations + chip_displays em paralelo
  // (todos dependem só de eventIds/playerIds que já temos)
  const [eventsRes, partsRes, chipDisplaysRes] = await Promise.all([
    eventIds.length > 0
      ? admin
          .from("events")
          .select("id, name, event_date, state, buy_in_cents, rebuy_cents")
          .in("id", eventIds)
          .order("event_date", { ascending: false })
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            event_date: string;
            state: string;
            buy_in_cents: number;
            rebuy_cents: number | null;
          }[],
        }),
    playerIds.length > 0
      ? admin
          .from("participations")
          .select("player_id, created_at, eliminated_at, match_id, eliminated_by_player_id")
          .in("player_id", playerIds)
      : Promise.resolve({
          data: [] as {
            player_id: string;
            created_at: string;
            eliminated_at: string | null;
            match_id: string;
            eliminated_by_player_id: string | null;
          }[],
        }),
    playerIds.length > 0
      ? admin
          .from("chip_displays")
          .select("amount, created_at, event_id")
          .in("player_id", playerIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as { amount: number; created_at: string; event_id: string }[],
        }),
  ]);

  const events = eventsRes.data ?? [];
  const parts = partsRes.data ?? [];
  const chipDisplays = chipDisplaysRes.data ?? [];

  const eventsById = new Map(
    events.map((e) => [
      e.id,
      {
        name: e.name,
        date: e.event_date,
        state: e.state,
        buyIn: e.buy_in_cents,
        rebuy: e.rebuy_cents,
      },
    ]),
  );

  // Soma tempo em mesa por player (cada participation pode ter eliminated_at;
  // se null e o evento ainda tá rodando, ignoramos pra não inflar)
  const tableTimeByPlayer = new Map<string, number>();
  for (const p of parts) {
    if (!p.eliminated_at) continue;
    const start = new Date(p.created_at).getTime();
    const end = new Date(p.eliminated_at).getTime();
    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    tableTimeByPlayer.set(p.player_id, (tableTimeByPlayer.get(p.player_id) ?? 0) + seconds);
  }

  const history: MyHistoryItem[] = (players ?? [])
    .map((p) => {
      const e = eventsById.get(p.event_id);
      if (!e) return null;
      return {
        playerId: p.id,
        eventId: p.event_id,
        eventName: e.name,
        eventDate: e.date,
        eventState: e.state,
        playerState: p.state,
        finalPosition: p.final_position,
        rebuysUsed: p.rebuys_used,
        timeAtTablesSeconds: tableTimeByPlayer.get(p.id) ?? null,
      } satisfies MyHistoryItem;
    })
    .filter((x): x is MyHistoryItem => x !== null)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));

  // ============= STATS =============
  const totalEvents = history.length;
  const champCount = history.filter((h) => h.playerState === "CAMPEAO").length;
  const podiumCount = history.filter((h) => PODIUM_STATES.has(h.playerState)).length;

  const positions = history
    .map((h) => h.finalPosition)
    .filter((p): p is number => p !== null && p > 0);
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null;
  const avgPosition =
    positions.length > 0
      ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
      : null;

  let totalSpentCents = 0;
  for (const h of history) {
    const e = eventsById.get(h.eventId);
    if (!e) continue;
    totalSpentCents += e.buyIn + (e.rebuy ?? 0) * h.rebuysUsed;
  }

  const totalTableTimeSeconds = Array.from(tableTimeByPlayer.values()).reduce(
    (a, b) => a + b,
    0,
  );

  // Chip displays
  const chipDisplayCount = chipDisplays.length;
  const maxChipsShown =
    chipDisplays.length > 0 ? Math.max(...chipDisplays.map((c) => c.amount)) : null;
  const totalChipsShown = chipDisplays.reduce((a, c) => a + c.amount, 0);
  const recentChipDisplays: ChipDisplaySummary[] = chipDisplays.slice(0, 10).map((c) => ({
    amount: c.amount,
    createdAt: c.created_at,
    eventName: eventsById.get(c.event_id)?.name ?? "Evento",
  }));

  // ============= RIVALIDADES =============
  // "Quem te eliminou" — vem direto das MY participations (parts já carregadas)
  const playerIdsSet = new Set(playerIds);
  const nemesisCount = new Map<string, number>(); // playerId → vezes que me eliminou
  let eliminationsSuffered = 0;
  for (const p of parts) {
    if (!p.eliminated_by_player_id) continue;
    eliminationsSuffered++;
    nemesisCount.set(
      p.eliminated_by_player_id,
      (nemesisCount.get(p.eliminated_by_player_id) ?? 0) + 1,
    );
  }

  // "Quem você eliminou" — busca participations onde eliminated_by IN myPlayerIds
  // (precisa de query nova; já temos os events do user pra restringir contexto)
  let eliminationsCaused = 0;
  const victimCount = new Map<string, number>(); // playerId → vezes que eliminei
  if (playerIds.length > 0) {
    const { data: causedParts } = await admin
      .from("participations")
      .select("player_id, eliminated_by_player_id")
      .in("eliminated_by_player_id", playerIds);
    for (const p of causedParts ?? []) {
      eliminationsCaused++;
      victimCount.set(p.player_id, (victimCount.get(p.player_id) ?? 0) + 1);
    }
  }

  // Resolve nomes dos players citados (myself + nemesis + vítimas)
  const rivalIds = Array.from(
    new Set([...nemesisCount.keys(), ...victimCount.keys()].filter((id) => !playerIdsSet.has(id))),
  );
  const rivalNamesById = new Map<string, { name: string; nickname: string | null }>();
  if (rivalIds.length > 0) {
    const { data: rivalPlayers } = await admin
      .from("players")
      .select("id, name, nickname")
      .in("id", rivalIds);
    for (const r of rivalPlayers ?? []) {
      rivalNamesById.set(r.id, { name: r.name, nickname: r.nickname });
    }
  }

  function topRival(counts: Map<string, number>): RivalryEntry | null {
    let best: { id: string; count: number } | null = null;
    for (const [id, count] of counts) {
      if (!best || count > best.count) best = { id, count };
    }
    if (!best) return null;
    const info = rivalNamesById.get(best.id);
    if (!info) return null;
    return { name: info.name, nickname: info.nickname, count: best.count };
  }

  const topNemesis = topRival(nemesisCount);
  const topVictim = topRival(victimCount);

  return {
    profile,
    email: authData.user?.email ?? null,
    history,
    stats: {
      totalEvents,
      champCount,
      podiumCount,
      bestPosition,
      avgPosition,
      totalSpentCents,
      totalTableTimeSeconds,
      chipDisplayCount,
      maxChipsShown,
      totalChipsShown,
      recentChipDisplays,
      eliminationsCaused,
      eliminationsSuffered,
      topVictim,
      topNemesis,
    },
  };
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
