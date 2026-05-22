"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";
import { pauseAllMatches, resumeAllMatches } from "@/lib/tournament/matches";

export function AllTablesControls({
  eventId,
  hasPlaying,
  hasPaused,
}: {
  eventId: string;
  hasPlaying: boolean;
  hasPaused: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handlePauseAll() {
    startTransition(async () => {
      try {
        const res = await pauseAllMatches(eventId);
        toast.success(`${res.paused} mesa${res.paused === 1 ? "" : "s"} pausada${res.paused === 1 ? "" : "s"}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  function handleResumeAll() {
    startTransition(async () => {
      try {
        const res = await resumeAllMatches(eventId);
        toast.success(`${res.resumed} mesa${res.resumed === 1 ? "" : "s"} retomada${res.resumed === 1 ? "" : "s"}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  if (!hasPlaying && !hasPaused) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {hasPlaying && (
        <button
          type="button"
          onClick={handlePauseAll}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-red-poker/40 bg-red-poker/5 px-4 text-sm text-red-poker transition-colors hover:bg-red-poker/10 disabled:opacity-50"
        >
          <Pause className="size-4" aria-hidden />
          Pausar todas
        </button>
      )}
      {hasPaused && (
        <button
          type="button"
          onClick={handleResumeAll}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-gold px-4 text-sm font-medium text-ink transition-colors hover:bg-gold/90 disabled:opacity-50"
        >
          <Play className="size-4" aria-hidden />
          Retomar todas
        </button>
      )}
    </div>
  );
}
