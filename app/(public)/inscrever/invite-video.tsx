"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { CONVITE_VIDEO_URL, parseVideoSource } from "./convite";

/**
 * Botão "Assistir o convite" sobre a moeda do hero. Ao tocar, abre um modal
 * com o vídeo (YouTube / Vimeo / arquivo direto — ver `convite.ts`).
 */
export function InviteVideo() {
  const [open, setOpen] = useState(false);
  const source = parseVideoSource(CONVITE_VIDEO_URL);

  // Bloqueia o scroll do body enquanto o modal está aberto + fecha no Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Assistir o convite em vídeo"
        className="group relative z-10 inline-flex items-center gap-3 self-center rounded-full border border-gold/60 bg-ink/45 py-3 pl-3 pr-6 font-mono text-[11px] uppercase tracking-[0.24em] text-paper backdrop-blur-md transition-all active:scale-[0.98] hover:border-gold hover:bg-gold/15"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-ink transition-transform group-hover:scale-105">
          <Play className="h-4 w-4 translate-x-[1px] fill-current" />
        </span>
        Assistir o convite
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vídeo-convite do PokerPi"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/80 text-paper transition-colors hover:border-gold hover:text-gold"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_24px_70px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoBody source={source} />
          </div>
        </div>
      )}
    </>
  );
}

function VideoBody({
  source,
}: {
  source: ReturnType<typeof parseVideoSource>;
}) {
  if (source.kind === "none") {
    return (
      <div className="flex aspect-[9/16] flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
          <Play className="h-6 w-6 translate-x-[1px] fill-current" />
        </span>
        <p className="font-display text-xl font-light text-paper">
          Vídeo em breve
        </p>
        <p className="max-w-[18rem] text-sm leading-relaxed text-gray-soft">
          O convite em vídeo está sendo preparado. Enquanto isso, desça e
          garanta sua vaga. ♠
        </p>
      </div>
    );
  }

  if (source.kind === "file") {
    return (
      <video
        className="aspect-[9/16] w-full bg-black object-cover"
        src={source.src}
        controls
        autoPlay
        playsInline
      />
    );
  }

  // youtube / vimeo / iframe
  return (
    <iframe
      className="aspect-[9/16] w-full bg-black"
      src={source.src}
      title="Vídeo-convite do PokerPi"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
