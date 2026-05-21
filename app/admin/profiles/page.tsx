import Link from "next/link";
import { listProfiles } from "@/lib/tournament/profiles";
import { buttonVariants } from "@/components/ui/button";
import { ProfileRowActions } from "./profile-row-actions";
import { formatDateBR } from "@/lib/format";

export const metadata = {
  title: "Perfis · Poker Pi",
};

export default async function ProfilesListPage() {
  const profiles = await listProfiles();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Perfis cadastrados
          </span>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight text-paper">
            {profiles.length} {profiles.length === 1 ? "pessoa" : "pessoas"}
          </h1>
        </div>
        <Link
          href="/admin/profiles/new"
          className={buttonVariants({ className: "h-12 bg-gold text-ink hover:bg-gold/90" })}
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
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-ink-2 text-gray-soft">
              <tr>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                  Nome
                </th>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                  Apelido
                </th>
                <th className="px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em]">
                  Admin
                </th>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]">
                  Cadastro
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2 text-paper">{p.name}</td>
                  <td className="px-4 py-2 font-display italic text-gold">
                    {p.nickname ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {p.is_admin ? (
                      <span className="rounded-full border border-gold/50 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                        Jogador
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-soft">
                    {formatDateBR(p.created_at, "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-2">
                    <ProfileRowActions
                      profileId={p.id}
                      name={p.name}
                      isAdmin={p.is_admin}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Dica: o e-mail e senha cadastrados aqui servem para a pessoa entrar em /login.
        Admins acessam /admin; outros vão pra /me (página do jogador).
      </p>
    </main>
  );
}
