import type { ReactNode } from "react";

const NOISE = "/event/noise.png";
// máscara: forte no centro, some nas bordas → ruído "em volta" da palavra
const MASK = "radial-gradient(ellipse 62% 68% at 50% 50%, #000 32%, rgba(0,0,0,0.6) 62%, transparent 84%)";

/**
 * Palavra estilizada: blur "bem de leve" (níveis via `amount`) + RUÍDO de filme
 * forte e VERMELHO (na cor do título) como máscara em volta do texto.
 * O blur fica só na palavra (camada de baixo); o ruído fica nítido por cima e
 * usa blend "lighten" com a cor → some o branco (só clareia o canal da cor).
 */
export function BlurWord({
  children,
  amount = 1,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative" style={{ filter: `blur(${amount}px)` }}>
        {children}
      </span>
      <span
        aria-hidden
        className="grain-text pointer-events-none absolute -inset-x-[6%] -inset-y-[22%]"
        style={{
          backgroundColor: "currentColor",
          backgroundImage: `url("${NOISE}")`,
          backgroundBlendMode: "multiply",
          backgroundSize: "78px 78px",
          mixBlendMode: "lighten",
          opacity: 1,
          WebkitMaskImage: MASK,
          maskImage: MASK,
        }}
      />
    </span>
  );
}
