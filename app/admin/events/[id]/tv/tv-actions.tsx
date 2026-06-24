"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button type="button" onClick={handleOpen}>
        <ExternalLink className="size-4" aria-hidden />
        Abrir TV em nova aba
      </Button>
      <Button type="button" variant="secondary" onClick={handleCopy}>
        <Copy className="size-4" aria-hidden />
        {copied ? "Copiado!" : "Copiar link"}
      </Button>
    </div>
  );
}
