import Link from "next/link";
import { listProfiles } from "@/lib/tournament/profiles";
import { buttonVariants } from "@/components/ui/button";
import { ProfileRowActions } from "./profile-row-actions";
import { formatDateBR } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = {
  title: "Perfis · Poker Pi",
};

export default async function ProfilesListPage() {
  const profiles = await listProfiles();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <LiveRefresh intervalMs={15000} />
      <header className="space-y-4 sm:flex sm:items-end sm:justify-between sm:space-y-0">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Perfis cadastrados
          </span>
          <h1 className="mt-1 font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
            {profiles.length} {profiles.length === 1 ? "pessoa" : "pessoas"}
          </h1>
        </div>
        <Link
          href="/admin/profiles/new"
          className={buttonVariants({
            className: "h-12 w-full bg-gold text-ink hover:bg-gold/90 sm:w-auto",
          })}
        >
          + Cadastrar pessoa
        </Link>
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-line bg-ink-2 px-6 py-12 text-center">
          <p className="font-display text-lg italic text-gray-soft">
            Nenhum perfil cadastrado ainda.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="space-y-3 rounded-lg border border-line bg-ink-2 p-4 sm:p-5"
            >
              {/* Linha 1: nome + badge admin/jogador */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl font-light text-paper sm:text-2xl break-words">
                    {p.name}
                  </div>
                  {p.nickname && (
                    <div className="font-display text-base italic text-gold break-words">
                      {p.nickname}
                    </div>
                  )}
                </div>
                {p.is_admin ? (
                  <span className="shrink-0 rounded-full border border-gold/50 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    Admin
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    Jogador
                  </span>
                )}
              </div>

              {/* Linha 2: data de cadastro */}
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
                Cadastrado em {formatDateBR(p.created_at, "dd/MM/yyyy")}
              </div>

              {/* Linha 3: ações */}
              <div className="border-t border-line pt-3">
                <ProfileRowActions
                  profileId={p.id}
                  name={p.name}
                  isAdmin={p.is_admin}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-md border border-line bg-ink-2 p-3 font-mono text-[10px] leading-relaxed uppercase tracking-[0.18em] text-gray-mid">
        Dica: o e-mail e senha cadastrados aqui servem para a pessoa entrar em
        /admin/login. Admins acessam /admin; outros vão pra /me (página do jogador).
      </p>
    </main>
  );
}
