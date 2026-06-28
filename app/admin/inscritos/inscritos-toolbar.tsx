"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import type { Subscription } from "@/lib/tournament/subscriptions";
import { Button } from "@/components/ui/button";

function toCsv(rows: Subscription[]): string {
  const header = [
    "Nome",
    "E-mail",
    "Telefone",
    "Pais",
    "Foi na 1a edicao",
    "Data",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  // Só os contabilizados entram na planilha.
  const lines = rows
    .filter((r) => r.counted !== false)
    .map((r) =>
    [
      r.full_name,
      r.email,
      r.phone,
      r.phone_country ?? "",
      r.attended_first_edition ? "Sim" : "Nao",
      new Date(r.created_at).toLocaleString("pt-BR"),
    ]
      .map((v) => esc(String(v)))
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}

export function InscritosToolbar({ rows }: { rows: Subscription[] }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/inscrever`
      : "/inscrever";

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Inscreva-se no PokerPi",
          text: "Garanta seu ingresso na nova edição do PokerPi:",
          url,
        });
        return;
      }
    } catch {
      // usuário cancelou — cai pro copy
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function exportCsv() {
    // BOM pra Excel reconhecer acentuação UTF-8.
    const blob = new Blob(["﻿" + toCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `inscritos-pokerpi-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Link público de inscrição
        </p>
        <p
          suppressHydrationWarning
          className="mt-1 truncate font-mono text-xs text-gray-soft"
        >
          {url}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button
          variant="default"
          onClick={share}
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
        </Button>
      </div>
    </div>
  );
}
