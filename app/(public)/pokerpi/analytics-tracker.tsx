"use client";

import { useEffect } from "react";
import { track, trackOnce } from "@/lib/analytics/client";

/**
 * Rastreio do funil da LP. Roda no navegador (robôs de preview não executam JS,
 * então não poluem os números). Dispara:
 *  - page_view: 1x por sessão de aba
 *  - section_ingressos: quando a seção de ingressos entra na tela (interesse)
 * Não renderiza nada.
 */
export function AnalyticsTracker({ eventId }: { eventId: string }) {
  useEffect(() => {
    trackOnce(`view:${eventId}`, "page_view", { eventId });

    const el = document.getElementById("ingressos");
    if (!el) return;
    let done = false;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !done) {
            done = true;
            trackOnce(`ingressos:${eventId}`, "section_ingressos", { eventId });
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [eventId]);

  return null;
}

/** CTA "Garantir ingresso" (hero / nav / CTA final). Anexa o evento. */
export function trackTicketCta(eventId: string) {
  track("ticket_cta_click", { eventId });
}
