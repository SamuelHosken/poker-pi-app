"use client";

import { useSyncExternalStore } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio/play-sound";

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("pokerpi:sound-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("pokerpi:sound-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): boolean {
  return isSoundEnabled();
}

function getServerSnapshot(): boolean {
  return false;
}

export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !enabled;
    setSoundEnabled(next);
    // "Primer" silencioso pra desbloquear autoplay no Safari/iOS
    if (next) {
      try {
        const a = new Audio();
        a.volume = 0;
        a.play().catch(() => {});
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`fixed bottom-4 right-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border bg-ink-2/90 px-4 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur transition-colors ${
        enabled
          ? "border-gold/40 text-gold hover:border-gold"
          : "border-line text-gray-soft hover:border-gold/40 hover:text-paper"
      }`}
      aria-pressed={enabled}
    >
      <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
      {enabled ? "Som ativo" : "Ativar som"}
    </button>
  );
}
