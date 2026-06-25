import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-ink px-4 py-10 sm:px-6">
      <div className="relative w-full max-w-sm space-y-7 rounded-2xl border border-gold/20 bg-ink-2/85 p-7 backdrop-blur-xl sm:p-8">
        <div className="space-y-2 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Poker Pi
          </span>
          <h1 className="font-display text-2xl font-light tracking-tight text-paper sm:text-3xl">
            Esqueci minha senha
          </h1>
          <p className="text-sm text-gray-soft">
            Digite seu e-mail. Mandamos um link pra criar uma nova senha.
          </p>
        </div>

        <ForgotForm />

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
