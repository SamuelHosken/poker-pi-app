import type { ReactNode } from "react";

const NOISE = "/event/noise.png";
// máscara radial: opaca no centro, some nas bordas → ruído "em volta" da palavra
const MASK = "radial-gradient(ellipse 58% 64% at 50% 50%, #000 28%, rgba(0,0,0,0.5) 58%, transparent 80%)";

/**
 * Palavra estilizada: a palavra com blur "de leve" (níveis via `amount`) e um
 * RUÍDO de filme animado como MÁSCARA em volta do texto (não recortado nas
 * letras) por cima, com blend overlay. Safari-safe (PNG + mask radial).
 */
export function BlurWord({
  children,
  amount = 2.5,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`} style={{ filter: `blur(${amount}px)` }}>
      <span className="relative">{children}</span>
      <span
        aria-hidden
        className="grain-text pointer-events-none absolute -inset-x-[6%] -inset-y-[22%]"
        style={{
          backgroundColor: "currentColor",
          backgroundImage: `url("${NOISE}")`,
          backgroundBlendMode: "multiply",
          backgroundSize: "85px 85px",
          mixBlendMode: "screen",
          opacity: 0.75,
          WebkitMaskImage: MASK,
          maskImage: MASK,
        }}
      />
    </span>
  );
}
