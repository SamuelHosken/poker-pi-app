"use client";
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { PIX_KEY, PIX_KEY_TYPE, PIX_RECEIVER, pixWhatsappLink } from "@/lib/tickets/pix";
import { pingPixCopied } from "@/lib/tickets/notify-copy";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixPanel({ amountCents, ticketId, onBack }: { amountCents: number; ticketId?: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (ticketId) void pingPixCopied(ticketId);
    } catch {
      // clipboard bloqueado - a chave fica visivel pra copiar na mao
    }
  }
  return (
    <div className="grid gap-5 rounded-3xl border border-cream-3 bg-cream p-6 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.6)]">
      <div className="text-center">
        <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-ink-warm-soft">
          Valor do PIX
        </span>
        <p className="font-condensed text-5xl font-extrabold tabular-nums text-ink-warm">{brl(amountCents)}</p>
      </div>

      <div className="rounded-2xl border-2 border-cream-3 bg-cream-2/60 p-4">
        <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-warm-soft">
          Chave PIX ({PIX_KEY_TYPE})
        </span>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="break-all font-medium text-ink-warm">{PIX_KEY}</span>
          <button
            type="button"
            onClick={copyKey}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink-warm px-3 py-1.5 font-condensed text-sm font-bold uppercase text-ink-warm transition-colors hover:bg-ink-warm hover:text-cream"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-warm-soft">Recebedor: {PIX_RECEIVER}</p>
      </div>

      <p className="text-center text-sm text-ink-warm">
        Faca o PIX e mande o comprovante no WhatsApp pra confirmar seu ingresso.
      </p>

      <a
        href={pixWhatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-condensed text-xl font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
      >
        <MessageCircle className="h-6 w-6" />
        Enviar comprovante
      </a>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs font-medium text-ink-warm-soft underline"
      >
        Voltar
      </button>
    </div>
  );
}
