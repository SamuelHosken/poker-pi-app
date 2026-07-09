"use client";

import { track } from "@/lib/analytics/client";
import type { SiteEventName } from "@/lib/analytics/types";

/** Link externo que registra o clique antes de abrir (WhatsApp, mapa, etc). */
export function TrackedLink({
  event,
  href,
  eventId,
  target,
  rel,
  className,
  children,
}: {
  event: SiteEventName;
  href: string;
  eventId?: string;
  target?: string;
  rel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => track(event, eventId ? { eventId } : undefined)}
    >
      {children}
    </a>
  );
}
