"use server";

import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";
import { CONVITES } from "@/app/(public)/inscrever/convites";

export type ConviteStatusKey =
  | "opened_not_subscribed" // abriu e NÃO se inscreveu — precisa cobrar
  | "subscribed" // se inscreveu (abrindo o link ou não)
  | "not_opened"; // ainda não abriu nem se inscreveu

export type ConviteStatus = {
  slug: string;
  name: string;
  opened: boolean;
  openCount: number;
  lastOpenedAt: string | null;
  subscribed: boolean;
  status: ConviteStatusKey;
};

export type ConviteStatsSummary = {
  rows: ConviteStatus[];
  total: number;
  subscribedCount: number;
  openedNotSubscribedCount: number;
  notOpenedCount: number;
};

/** Tira acento e baixa pra comparar nome com slug. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** A inscrição é desta pessoa? Casa por slug (preciso) ou por nome (legado). */
function matchesPerson(
  sub: { full_name: string; convite_slug: string | null },
  slug: string,
): boolean {
  if (sub.convite_slug === slug) return true;
  const words = normalize(sub.full_name).split(/[^a-z0-9]+/).filter(Boolean);
  return words.includes(slug);
}

/**
 * Status de cada convidado: abriu o link? se inscreveu? Admin-only (service
 * role). Ordena os "abriu e não se inscreveu" primeiro — são os pra cobrar.
 */
export async function getConviteStatuses(): Promise<ConviteStatsSummary> {
  await requireAdmin();
  const db = rawServiceClient();

  const [opensRes, subsRes] = await Promise.all([
    db.from("convite_opens").select("slug, opened_at"),
    db.from("subscriptions").select("full_name, convite_slug"),
  ]);

  const opens = (opensRes.data ?? []) as { slug: string; opened_at: string }[];
  const subs = (subsRes.data ?? []) as {
    full_name: string;
    convite_slug: string | null;
  }[];

  const rows: ConviteStatus[] = Object.entries(CONVITES).map(
    ([slug, { name }]) => {
      const mine = opens.filter((o) => o.slug === slug);
      const openCount = mine.length;
      const lastOpenedAt =
        mine.length > 0
          ? mine
              .map((o) => o.opened_at)
              .sort()
              .at(-1)!
          : null;
      const subscribed = subs.some((s) => matchesPerson(s, slug));

      const status: ConviteStatusKey = subscribed
        ? "subscribed"
        : openCount > 0
          ? "opened_not_subscribed"
          : "not_opened";

      return { slug, name, opened: openCount > 0, openCount, lastOpenedAt, subscribed, status };
    },
  );

  // Ordena: cobrar (abriu, não inscreveu) → ainda não abriu → inscritos.
  const order: Record<ConviteStatusKey, number> = {
    opened_not_subscribed: 0,
    not_opened: 1,
    subscribed: 2,
  };
  rows.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""),
  );

  return {
    rows,
    total: rows.length,
    subscribedCount: rows.filter((r) => r.subscribed).length,
    openedNotSubscribedCount: rows.filter(
      (r) => r.status === "opened_not_subscribed",
    ).length,
    notOpenedCount: rows.filter((r) => r.status === "not_opened").length,
  };
}
