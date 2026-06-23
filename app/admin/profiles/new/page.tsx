import Link from "next/link";
import { NewProfileForm } from "./new-profile-form";

export const metadata = {
  title: "Cadastrar pessoa · Poker Pi",
};

export default function NewProfilePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
      <Link
        href="/admin/profiles"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Perfis
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Cadastrar pessoa
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
          Novo perfil
        </h1>
        <p className="text-sm text-gray-soft">
          Cria login e perfil no banco. A pessoa entra com esse e-mail e senha.
        </p>
      </header>

      <NewProfileForm />
    </main>
  );
}
