import type { ReactNode } from "react";

/**
 * Palavra levemente borrada (a própria palavra, blur "de leve") — efeito de
 * foco suave, como o texto dos vídeos. Ainda legível.
 */
export function BlurWord({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block ${className}`} style={{ filter: "blur(2.5px)" }}>
      {children}
    </span>
  );
}
