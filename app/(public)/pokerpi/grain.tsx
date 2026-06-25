/**
 * Ruído de filme via PNG real (Safari-safe — filtro SVG não renderiza bg no
 * Safari). Camadas pra dar textura cinematográfica, como nos vídeos.
 */
const NOISE = "/event/noise.png";

export function Grain({
  className = "",
  opacity = 0.22,
  blend = "overlay",
}: {
  className?: string;
  opacity?: number;
  blend?: "overlay" | "soft-light" | "normal";
}) {
  return (
    <div
      aria-hidden
      className={`grain-anim pointer-events-none absolute inset-0 z-30 ${className}`}
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: "180px 180px", opacity, mixBlendMode: blend }}
    />
  );
}

/**
 * Ruído FORTE e animado, fixo sobre a página inteira. Pisca como grão de
 * filme real. pointer-events-none (não atrapalha cliques).
 */
export function GrainOverlay({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="grain-fixed pointer-events-none fixed inset-[-50%] z-[70] h-[200%] w-[200%]"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: "170px 170px", opacity, mixBlendMode: "normal" }}
    />
  );
}
