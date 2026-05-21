"use client";

import { useEffect } from "react";

export default function TVError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-ink p-10 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
        TV indisponível
      </span>
      <h1 className="mt-4 font-display text-4xl font-light text-paper">
        Não consegui carregar este evento.
      </h1>
      <p className="mt-2 text-sm text-gray-soft">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 h-11 rounded-md border border-gold/40 px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/10"
      >
        Tentar de novo
      </button>
    </div>
  );
}
