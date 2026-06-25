/**
 * Camada de ruído (grão de filme) — sobreposição sutil pra dar textura
 * cinematográfica, como nos vídeos. O pai precisa ser `relative`.
 */
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Grain({
  className = "",
  opacity = 0.08,
  blend = "overlay",
}: {
  className?: string;
  opacity?: number;
  blend?: "overlay" | "soft-light";
}) {
  return (
    <div
      aria-hidden
      className={`grain-anim pointer-events-none absolute inset-0 z-[1] ${className}`}
      style={{
        backgroundImage: `url("${NOISE}")`,
        backgroundSize: "180px 180px",
        opacity,
        mixBlendMode: blend,
      }}
    />
  );
}
