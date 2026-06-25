import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/tournament/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

export default async function LoginPage() {
  // Se já logado, manda pro destino certo (não fica preso na tela de login).
  const { userId, isAdmin } = await getCurrentUserAndProfile();
  if (userId) {
    redirect(isAdmin ? "/admin/events" : "/me");
  }

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-ink px-4 py-10 sm:px-6 sm:py-12">
      {/* Vídeo de fundo em loop */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/login-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      />

      {/* Camada de escurecimento + viñeta pra legibilidade */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/65 to-ink/95"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.7)_100%)]"
      />

      {/* Card de login */}
      <div className="relative w-full max-w-sm">
        {/* Glow atrás do card */}
        <div className="absolute -inset-4 rounded-3xl bg-gold/10 blur-3xl" aria-hidden />

        <div className="relative space-y-7 rounded-2xl border border-gold/20 bg-ink-2/85 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
          <div className="space-y-2 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
              Poker Pi
            </span>
            <h1 className="font-display text-3xl font-light tracking-tight text-paper sm:text-4xl">
              Bem-<em className="not-italic italic text-gold">vindo</em>
              <span className="text-red-poker">.</span>
            </h1>
            <p className="text-sm text-gray-soft">
              Entre com sua conta pra continuar.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
