"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";
import { pauseAllMatches, resumeAllMatches } from "@/lib/tournament/matches";
import { Button } from "@/components/ui/button";

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
        <Button
          variant="destructive"
          onClick={handlePauseAll}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
        >
          <Pause aria-hidden />
          Pausar todas
        </Button>
      )}
      {hasPaused && (
        <Button
          onClick={handleResumeAll}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
        >
          <Play aria-hidden />
          Retomar todas
        </Button>
      )}
    </div>
  );
}
