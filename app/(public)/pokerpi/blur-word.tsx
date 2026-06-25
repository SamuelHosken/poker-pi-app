import type { ReactNode } from "react";

/**
 * Palavra estilizada: apenas blur "de leve" (níveis via `amount`), sem ruído.
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
    <span className={`inline-block ${className}`} style={{ filter: `blur(${amount}px)` }}>
      {children}
    </span>
  );
}
