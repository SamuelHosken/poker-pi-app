import Link from "next/link";
import { getCurrentUserId } from "@/lib/tournament/auth";
import { logoutAction } from "./login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      {userId && (
        <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link
              href="/admin/events"
              className="flex items-baseline gap-1.5 font-display text-base font-light tracking-tight no-underline sm:gap-2 sm:text-lg"
            >
              Poker <em className="not-italic italic text-gold">Pi</em>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-gray-soft sm:inline">
                · admin
              </span>
            </Link>

            <nav className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft sm:gap-4">
              <Link href="/admin/events" className="hover:text-paper">
                Eventos
              </Link>
              <Link href="/admin/profiles" className="hover:text-paper">
                Perfis
              </Link>
              <Link href="/admin/galeria" className="hover:text-paper">
                Galeria
              </Link>
              <Link href="/me" prefetch className="text-gold hover:text-paper">
                Jogar
              </Link>
            </nav>

            <form action={logoutAction}>
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft transition-colors hover:text-paper"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
      )}

      <div className="flex-1">{children}</div>
    </div>
  );
}
