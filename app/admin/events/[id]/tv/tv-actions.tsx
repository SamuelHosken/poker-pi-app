"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, RotateCw } from "lucide-react";

export function TvActions({ tvUrl }: { tvUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setCopied(true);
      toast.success("Link da TV copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não consegui copiar — copie manualmente");
    }
  }

  function handleOpen() {
    window.open(tvUrl, "_blank", "noopener,noreferrer");
  }

  function handleRefresh() {
    toast.info("Recarregue a aba da TV manualmente (F5 ou ⌘R)");
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-gold/90"
      >
        <ExternalLink className="size-4" aria-hidden />
        Abrir TV em nova aba
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-ink-2 px-5 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold"
      >
        <Copy className="size-4" aria-hidden />
        {copied ? "Copiado!" : "Copiar link"}
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-ink-2 px-5 text-sm text-gray-soft transition-colors hover:border-gold/40 hover:text-gold"
      >
        <RotateCw className="size-4" aria-hidden />
        Recarregar TV
      </button>
    </div>
  );
}
