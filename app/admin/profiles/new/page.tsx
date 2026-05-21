import Link from "next/link";
import { NewProfileForm } from "./new-profile-form";

export const metadata = {
  title: "Cadastrar pessoa · Poker Pi",
};

export default function NewProfilePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10 space-y-8">
      <Link
        href="/admin/profiles"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
      >
        ← Perfis
      </Link>

      <header className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Cadastrar pessoa
        </span>
        <h1 className="font-display text-4xl font-light tracking-tight text-paper">
          Novo perfil
        </h1>
        <p className="text-sm text-gray-soft">
          Cria login (e-mail + senha) e perfil no banco. Pessoa pode entrar em
          /login depois.
        </p>
      </header>

      <NewProfileForm />
    </main>
  );
}
