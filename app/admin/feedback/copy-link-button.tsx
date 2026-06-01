"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Mostra o link público de avaliação (/avaliar) e oferece copiar / compartilhar.
 */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  // Computado no render: no SSR vira "/avaliar"; no cliente, o link absoluto.
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/avaliar`
      : "/avaliar";

  async function copy() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Avalie o PokerPi",
          text: "Conta pra gente como foi o último PokerPi:",
          url,
        });
        return;
      }
    } catch {
      // usuário cancelou o share — cai pro copy
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Link de avaliação
        </p>
        <p
          suppressHydrationWarning
          className="mt-1 truncate font-mono text-xs text-gray-soft"
        >
          {url}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        style={{ touchAction: "manipulation" }}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-opacity hover:opacity-90"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Copiado
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" /> Compartilhar
          </>
        )}
      </button>
    </div>
  );
}
