"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { transitionEventState } from "@/lib/tournament/events";
import type { EventState } from "@/lib/types/domain";

export function AdvanceStateButton({
  eventId,
  targetState,
  label,
  disabled = false,
}: {
  eventId: string;
  targetState: EventState;
  label: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await transitionEventState({ id: eventId, newState: targetState });
        toast.success("Estado atualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      className="h-12 bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
    >
      {pending ? "Atualizando…" : label}
    </Button>
  );
}
