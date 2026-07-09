"use client";
import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Texto que "acende" ao entrar na tela: pisca em branco algumas vezes (como
 * letreiro de neon / grão de filme) e depois assenta na cor real do elemento.
 * A cor final vem da própria classe (ex.: text-red-brand) pois o miolo usa
 * `color: inherit` no fim da animação. Respeita prefers-reduced-motion.
 */
export function FlickerText({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  if (reduce) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span ref={ref} className={className}>
      <span
        className={inView ? "flicker-in" : "flicker-pre"}
        style={inView ? { animationDelay: `${delay}s` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}
