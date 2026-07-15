"use client";

import { useState, useTransition } from "react";
import { runReconcile } from "./actions";

/**
 * Botao de reconciliar ingressos pendentes contra o Asaas. Confirma pagamentos
 * que o webhook nao pegou (marca pago, gera QR, manda e-mail). Feedback inline.
 */
export function ReconcileButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              const r = await runReconcile();
              setMsg(
                r.confirmed > 0
                  ? `${r.confirmed} confirmado(s) de ${r.checked} pendente(s).`
                  : `Nada novo. ${r.checked} pendente(s) conferido(s).`,
              );
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falhou. Tente de novo.");
            }
          })
        }
        className="rounded-lg border border-line bg-ink-2 px-3 py-1.5 text-sm text-gold hover:bg-ink disabled:opacity-40"
      >
        {pending ? "Reconciliando..." : "Reconciliar pendentes"}
      </button>
      {msg && <span className="text-sm text-gray-soft">{msg}</span>}
    </div>
  );
}
