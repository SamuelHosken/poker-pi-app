import type { Metadata } from "next";
import { getCurrentUserId } from "@/lib/tournament/auth";
import { getMyProfile } from "@/lib/tournament/profiles";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";

// Título do navegador/Google no admin: "Poker Pi Admin" (e "X · Poker Pi Admin"
// nas subpáginas que definem um nome próprio).
export const metadata: Metadata = {
  title: {
    default: "Poker Pi Admin",
    template: "%s · Poker Pi Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();

  // Páginas públicas do admin (login/forgot/reset): sem shell.
  if (!userId) {
    return (
      <div className="flex min-h-svh flex-col bg-ink text-paper">{children}</div>
    );
  }

  const profile = await getMyProfile();
  const name = profile?.name ?? "Admin";
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <div className="flex min-h-svh bg-ink text-paper">
      <AdminSidebar name={name} avatarUrl={avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar name={name} avatarUrl={avatarUrl} />
        <main className="flex-1 pb-28 md:pb-0">{children}</main>
        <AdminBottomNav />
      </div>
    </div>
  );
}
