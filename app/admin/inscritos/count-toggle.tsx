"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { setSubscriptionCounted } from "@/lib/tournament/subscriptions";

/**
 * Botão por inscrição: contabilizar / não contabilizar. Atualiza no banco e
 * dá refresh — os números e a planilha passam a ignorar quem está marcado.
 */
export function CountToggle({
  id,
  counted,
}: {
  id: string;
  counted: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setSubscriptionCounted(id, !counted);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={!counted}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50",
        counted
          ? "border-line text-gray-soft hover:border-red-poker/60 hover:text-red-poker"
          : "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
      ].join(" ")}
    >
      {counted ? (
        <>
          <Ban className="h-3 w-3" /> Não contabilizar
        </>
      ) : (
        <>
          <RotateCcw className="h-3 w-3" /> Contabilizar
        </>
      )}
    </button>
  );
}
