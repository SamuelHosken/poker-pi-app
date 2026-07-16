"use client";

import { useState, useTransition } from "react";
import { runReconcile, runResend } from "./actions";

/**
 * Ferramentas de pagamento no admin de ingressos:
 *  - Reconciliar: confirma pendentes que o webhook perdeu (pago + QR + e-mail) e
 *    limpa vencidos/velhos/lotados. Rede de seguranca.
 *  - Reenviar: re-manda o e-mail do ingresso pra TODOS os pagos (vespera do
 *    evento ou se a entrega falhou).
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
              const parts: string[] = [];
              if (r.confirmed > 0) parts.push(`${r.confirmed} confirmado(s)`);
              if (r.cleaned > 0) parts.push(`${r.cleaned} limpo(s)`);
              setMsg(parts.length ? `${parts.join(" · ")} de ${r.checked} pendente(s).` : `Nada novo. ${r.checked} conferido(s).`);
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falhou. Tente de novo.");
            }
          })
        }
        className="rounded-lg border border-line bg-ink-2 px-3 py-1.5 text-sm text-gold hover:bg-ink disabled:opacity-40"
      >
        {pending ? "Processando..." : "Reconciliar pendentes"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              const r = await runResend();
              setMsg(`Ingresso reenviado pra ${r.sent}/${r.total} pago(s)${r.failed ? ` (${r.failed} falha)` : ""}.`);
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falhou. Tente de novo.");
            }
          })
        }
        className="rounded-lg border border-line bg-ink-2 px-3 py-1.5 text-sm text-gray-soft hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        Reenviar ingressos (todos pagos)
      </button>
      {msg && <span className="text-sm text-gray-soft">{msg}</span>}
    </div>
  );
}
