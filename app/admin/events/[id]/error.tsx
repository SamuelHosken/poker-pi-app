"use client";

import { useEffect } from "react";

export default function EventError({
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
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-20 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
        Algo deu errado
      </span>
      <h1 className="font-display text-3xl font-light tracking-tight text-paper">
        Não consegui carregar o evento
      </h1>
      <p className="text-sm text-gray-soft">
        {error.message || "Erro desconhecido."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-md bg-gold px-5 font-medium text-ink hover:bg-gold/90"
      >
        Tentar de novo
      </button>
    </main>
  );
}
