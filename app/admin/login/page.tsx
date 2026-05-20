import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar · Poker Pi",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Poker Pi
          </span>
          <h1 className="font-display text-4xl font-light tracking-tight text-paper">
            Painel <em className="not-italic italic text-gold">administrador</em>
            <span className="text-red-poker">.</span>
          </h1>
          <p className="text-sm text-gray-soft">
            Acesso restrito ao organizador do torneio.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
