"use client";

import { useEffect } from "react";
import { recordConviteOpen } from "./actions";

/**
 * Registra a abertura do link de convite quando uma pessoa real abre a página.
 * Roda no navegador (useEffect) — robôs de preview não executam JS, então não
 * geram falsa abertura. Guarda em sessionStorage pra não recontar refresh na
 * mesma aba. Não renderiza nada.
 */
export function ConviteOpenTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `convite-open:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível (modo privado) — segue e registra mesmo assim
    }
    void recordConviteOpen(slug);
  }, [slug]);

  return null;
}
