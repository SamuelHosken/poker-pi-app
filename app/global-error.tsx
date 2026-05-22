"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-svh flex-col items-center justify-center gap-6 bg-ink px-4 py-8 text-center text-paper">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-poker">
          Erro inesperado
        </span>
        <h1 className="max-w-md font-display text-2xl font-light tracking-tight sm:text-3xl">
          Algo quebrou no caminho.
        </h1>
        <p className="max-w-md text-sm text-gray-soft">
          Já registramos o erro. Tente recarregar a página.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold/90"
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
