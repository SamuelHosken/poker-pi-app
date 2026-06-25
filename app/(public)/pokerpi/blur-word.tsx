import type { ReactNode } from "react";

/**
 * Palavra com "fantasma" desfocado atrás (blur leve) — profundidade/glow,
 * como o texto atrás da pessoa nos vídeos. A palavra da frente fica nítida.
 */
export function BlurWord({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span aria-hidden className="absolute inset-0 select-none opacity-70 blur-[7px]">
        {children}
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}
