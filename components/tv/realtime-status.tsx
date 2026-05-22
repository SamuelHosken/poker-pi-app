"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Status = "connecting" | "ok" | "reconnecting" | "error";

/**
 * V1.3 — Indicador discreto do estado da conexão Realtime.
 * Um ponto colorido no canto da TV. Verde = OK, amarelo = reconectando,
 * vermelho = erro. Some quando tudo está OK por mais de 5s pra não poluir.
 */
export function RealtimeStatus({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    // Canal ping dedicado — não interfere com os outros do TV
    const channel = supabase.channel(`tv-ping-${eventId}`);
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") setStatus("ok");
      else if (state === "CHANNEL_ERROR") setStatus("error");
      else if (state === "TIMED_OUT" || state === "CLOSED") setStatus("reconnecting");
      else setStatus("connecting");
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Fica visível por 5s quando OK, depois some
  useEffect(() => {
    if (status === "ok") {
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    return undefined;
  }, [status]);

  if (!visible && status === "ok") return null;

  const { color, label, dotPulse } = {
    connecting: { color: "bg-gray-soft", label: "Conectando…", dotPulse: true },
    ok: { color: "bg-green-500", label: "Realtime conectado", dotPulse: false },
    reconnecting: { color: "bg-yellow-500", label: "Reconectando…", dotPulse: true },
    error: { color: "bg-red-poker", label: "Sem conexão", dotPulse: true },
  }[status];

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-line bg-ink-2/85 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft backdrop-blur transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}
    >
      <span
        className={`size-2 rounded-full ${color}`}
        style={dotPulse ? { animation: "rt-pulse 1.4s ease-in-out infinite" } : {}}
        aria-hidden
      />
      <span>{label}</span>
      <style>{`
        @keyframes rt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
