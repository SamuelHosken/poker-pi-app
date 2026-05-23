"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renderiza a Server Component da rota atual periodicamente via
 * `router.refresh()`. Usado em listas/dashboards onde mudanças vindas de
 * OUTRAS sessões (admin adiciona player, outro tab edita perfil) precisam
 * aparecer sem o usuário dar reload.
 *
 * - Pausa quando a aba está oculta (visibilitychange) — não desperdiça
 *   request enquanto ninguém olha.
 * - Re-sincroniza imediatamente ao voltar.
 *
 * Para "ao vivo de verdade" (cronômetro, TV) use Supabase Realtime direto;
 * este componente é o fallback barato e uniforme pro resto do app.
 */
export function LiveRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(() => router.refresh(), intervalMs);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    }

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
