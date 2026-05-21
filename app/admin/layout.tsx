import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logoutAction } from "./login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      {user && (
        <header className="flex items-center justify-between border-b border-line bg-ink/80 px-6 py-3 backdrop-blur">
          <div className="flex items-baseline gap-6">
            <Link
              href="/admin/events"
              className="flex items-baseline gap-2 font-display text-lg font-light tracking-tight no-underline"
            >
              Poker <em className="not-italic italic text-gold">Pi</em>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-soft">
                · admin
              </span>
            </Link>

            <nav className="flex items-baseline gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
              <Link href="/admin/events" className="hover:text-paper">
                Eventos
              </Link>
              <Link href="/admin/profiles" className="hover:text-paper">
                Perfis
              </Link>
            </nav>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft transition-colors hover:text-paper"
            >
              Sair
            </button>
          </form>
        </header>
      )}

      <div className="flex-1">{children}</div>
    </div>
  );
}
