"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { checkInTicket, getCheckinCounts } from "@/lib/tickets/checkin";

function extractToken(text: string): string {
  const m = text.match(/\/ingresso\/([^/?#]+)/);
  return m?.[1] ?? text.trim();
}

type Result =
  | { kind: "valid"; name: string; plan: string; openBar: boolean }
  | { kind: "already"; name: string; plan: string; openBar: boolean; at: string | null }
  | { kind: "invalid"; message: string };

function timeOf(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function QrScanner() {
  const [result, setResult] = useState<Result | null>(null);
  const [counts, setCounts] = useState<{ present: number; sold: number }>({ present: 0, sold: 0 });
  const busy = useRef(false);

  const refreshCounts = useCallback(async () => {
    try {
      const c = await getCheckinCounts();
      setCounts({ present: c.present, sold: c.sold });
    } catch {
      /* silencioso */
    }
  }, []);

  // Contador ao vivo (a cada 4s).
  useEffect(() => {
    refreshCounts();
    const id = setInterval(refreshCounts, 4000);
    return () => clearInterval(id);
  }, [refreshCounts]);

  // Scanner.
  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          if (busy.current) return;
          busy.current = true;
          try {
            const r = await checkInTicket(extractToken(decoded));
            if (!r.ok) {
              setResult({ kind: "invalid", message: r.error });
            } else if (r.already) {
              setResult({ kind: "already", name: r.buyerName, plan: r.ticketName, openBar: r.isOpenBar, at: r.checkedInAt });
            } else {
              setResult({ kind: "valid", name: r.buyerName, plan: r.ticketName, openBar: r.isOpenBar });
              refreshCounts();
            }
          } catch {
            setResult({ kind: "invalid", message: "Erro ao validar. Tente de novo." });
          }
          setTimeout(() => {
            busy.current = false;
            setResult(null);
          }, 3200);
        },
        () => {},
      )
      .catch(() => setResult({ kind: "invalid", message: "Não consegui abrir a câmera." }));
    return () => {
      scanner.stop().catch(() => {});
    };
  }, [refreshCounts]);

  const remaining = Math.max(0, counts.sold - counts.present);

  return (
    <div className="space-y-4">
      {/* Contador ao vivo */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-ink-2 p-3 text-center">
        <Counter label="Presentes" value={counts.present} tone="text-live" />
        <Counter label="Vendidos" value={counts.sold} tone="text-paper" />
        <Counter label="Faltam" value={remaining} tone="text-gold" />
      </div>

      {/* Câmera */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <div id="qr-reader" className="[&_video]:w-full [&_video]:object-cover" />

        {/* Resultado em tela cheia sobre a câmera */}
        {result && <ResultOverlay result={result} />}
      </div>

      <p className="text-center text-xs text-gray-mid">
        Aponte a câmera para o QR Code do ingresso.
      </p>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">{label}</div>
    </div>
  );
}

function PlanBadge({ plan, openBar }: { plan: string; openBar: boolean }) {
  return (
    <span
      className={
        openBar
          ? "inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-lg font-extrabold uppercase tracking-wide text-ink shadow-[0_8px_30px_-6px_rgba(217,184,118,0.8)]"
          : "inline-flex items-center gap-2 rounded-full border border-white/70 px-5 py-2 text-lg font-bold uppercase tracking-wide text-white"
      }
    >
      {openBar ? "🥃 Open Bar" : plan}
    </span>
  );
}

function ResultOverlay({ result }: { result: Result }) {
  const base =
    "absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center animate-[ciFade_180ms_ease-out]";
  if (result.kind === "valid") {
    return (
      <div className={`${base} bg-[#0f3d2e]/97`}>
        <CheckCircle2 className="h-20 w-20 text-live" strokeWidth={2.2} />
        <div className="font-mono text-sm uppercase tracking-[0.3em] text-live">Válido</div>
        <div className="text-3xl font-bold leading-tight text-white">{result.name}</div>
        <PlanBadge plan={result.plan} openBar={result.openBar} />
        <style>{ciKeyframes}</style>
      </div>
    );
  }
  if (result.kind === "already") {
    return (
      <div className={`${base} bg-[#3a2e0a]/97`}>
        <AlertTriangle className="h-20 w-20 text-gold" strokeWidth={2.2} />
        <div className="font-mono text-sm uppercase tracking-[0.3em] text-gold">Já entrou</div>
        <div className="text-3xl font-bold leading-tight text-white">{result.name}</div>
        <PlanBadge plan={result.plan} openBar={result.openBar} />
        {result.at && <div className="text-sm text-gold-soft">Check-in feito às {timeOf(result.at)}</div>}
        <style>{ciKeyframes}</style>
      </div>
    );
  }
  return (
    <div className={`${base} bg-[#3d0f12]/97`}>
      <XCircle className="h-20 w-20 text-red-poker" strokeWidth={2.2} />
      <div className="font-mono text-sm uppercase tracking-[0.3em] text-red-poker">Inválido</div>
      <div className="max-w-xs text-xl font-semibold leading-snug text-white">{result.message}</div>
      <style>{ciKeyframes}</style>
    </div>
  );
}

const ciKeyframes = "@keyframes ciFade{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}";
