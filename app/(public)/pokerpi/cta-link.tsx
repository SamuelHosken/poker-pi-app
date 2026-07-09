"use client";

import { track } from "@/lib/analytics/client";

/**
 * Link de CTA "Garantir ingresso" que registra o clique (intenção) antes de
 * rolar pra seção de ingressos. Usado no nav, no hero e no CTA final.
 */
export function CtaLink({
  eventId,
  href = "#ingressos",
  className,
  children,
}: {
  eventId: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className} onClick={() => track("ticket_cta_click", { eventId })}>
      {children}
    </a>
  );
}
