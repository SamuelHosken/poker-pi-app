"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, X } from "lucide-react";
import {
  CONVITE_PUBLIC_ID,
  cloudinaryPosterUrl,
  cloudinaryVideoUrl,
} from "./convite";

/**
 * Botão "Assistir o convite" sobre a moeda do hero. Ao tocar, abre um modal
 * que JÁ COMEÇA a tocar o vídeo (Cloudinary, <video> nativo otimizado).
 *
 * Autoplay no celular só é permitido sem som — então iniciamos mudo (começa a
 * rodar na hora) e mostramos um botão pra ativar o som num toque.
 */
export function InviteVideo() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = CONVITE_PUBLIC_ID.trim().length > 0;
  const src = hasVideo ? cloudinaryVideoUrl(CONVITE_PUBLIC_ID) : "";
  const poster = hasVideo ? cloudinaryPosterUrl(CONVITE_PUBLIC_ID) : "";

  // Bloqueia o scroll do body + fecha no Esc enquanto o modal está aberto.
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

  // Ao abrir: tenta tocar COM som; se o navegador bloquear (celular), cai pra
  // mudo e toca mesmo assim (mostra o botão de ativar som).
  useEffect(() => {
    if (!open || !hasVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, [open, hasVideo]);

  function enableSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    void v.play().catch(() => {});
  }

  function close() {
    setOpen(false);
  }

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
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Vídeo-convite do PokerPi"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/80 text-paper transition-colors hover:border-gold hover:text-gold"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-black shadow-[0_24px_70px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            {hasVideo ? (
              <>
                <video
                  ref={videoRef}
                  src={src}
                  poster={poster}
                  className="block aspect-video w-full bg-black"
                  autoPlay
                  muted
                  playsInline
                  controls
                  preload="auto"
                />

                {/* Ativar som — aparece enquanto estiver mudo (autoplay do celular) */}
                {muted && (
                  <button
                    type="button"
                    onClick={enableSound}
                    className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform active:scale-95 motion-safe:animate-pulse"
                  >
                    <Volume2 className="h-4 w-4" />
                    Tocar com som
                  </button>
                )}
              </>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <Play className="h-6 w-6 translate-x-[1px] fill-current" />
                </span>
                <p className="font-display text-xl font-light text-paper">
                  Vídeo em breve
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
