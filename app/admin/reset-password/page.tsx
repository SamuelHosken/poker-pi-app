import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nova senha" };

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-ink px-4 py-10 sm:px-6">
      <div className="relative w-full max-w-sm space-y-7 rounded-2xl border border-gold/20 bg-ink-2/85 p-7 backdrop-blur-xl sm:p-8">
        <div className="space-y-2 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Poker Pi
          </span>
          <h1 className="font-display text-2xl font-light tracking-tight text-paper sm:text-3xl">
            Definir nova senha
          </h1>
          <p className="text-sm text-gray-soft">
            Mínimo 6 caracteres.
          </p>
        </div>

        <ResetForm />

        <div className="text-center">
          <Link
            href="/admin/login"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:text-paper"
          >
            ← Voltar pro login
          </Link>
        </div>
      </div>
    </main>
  );
}
