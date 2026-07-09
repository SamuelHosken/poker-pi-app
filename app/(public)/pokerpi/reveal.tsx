"use client";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Reveal ao rolar (fade + sobe), à prova de falha.
 *
 * O conteúdo é VISÍVEL por padrão (ver globals.css). Só fica escondido quando o
 * <html> ganha a classe .js-reveal — adicionada por um script inline ANTES da
 * pintura (no page.tsx). Cada Reveal observa a si mesmo e adiciona .is-visible
 * ao entrar na tela. Marca window.__ppRevealReady pra avisar o failsafe que o JS
 * está vivo (se nenhum Reveal montar, o failsafe remove .js-reveal e tudo
 * aparece). Assim nunca mais acontece "página em branco" quando o JS falha.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (window as unknown as { __ppRevealReady?: boolean }).__ppRevealReady = true;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}s` } : undefined;
  return (
    <div ref={ref} className={`pp-reveal ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
