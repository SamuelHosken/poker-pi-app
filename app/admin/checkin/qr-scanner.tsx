"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInTicket } from "@/lib/tickets/checkin";

function extractToken(text: string): string {
  const m = text.match(/\/ingresso\/([^/?#]+)/);
  return m?.[1] ?? text.trim();
}

export function QrScanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decoded) => {
          if (busy.current) return;
          busy.current = true;
          const r = await checkInTicket(extractToken(decoded));
          setResult(
            r.ok
              ? `${r.already ? "JÁ ENTROU — " : "✓ "}${r.buyerName} · ${r.ticketName}`
              : `✗ ${r.error}`,
          );
          setTimeout(() => {
            busy.current = false;
          }, 2500);
        },
        () => {},
      )
      .catch(() => setResult("Não consegui abrir a câmera."));
    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-4">
      <div id="qr-reader" ref={ref} className="overflow-hidden rounded-2xl border border-line" />
      {result && (
        <p className="rounded-xl bg-ink-2 p-4 text-center text-lg font-semibold text-gold">
          {result}
        </p>
      )}
    </div>
  );
}
