"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio/play-sound";
import { playSynth } from "@/lib/audio/synth";

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
  // Esconde o botão até hidratar pra não mostrar "Ativar som" brevemente
  // quando o user já tinha ativado antes (estado vem do localStorage).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  function toggle() {
    const next = !enabled;
    setSoundEnabled(next);
    // "Primer" do AudioContext + audio.play() pra desbloquear autoplay no
    // Safari/iOS. Toca uma reação inaudível dentro do gesto de toque pra
    // criar/resumir o AudioContext sintetizado.
    if (next) {
      try {
        const a = new Audio();
        a.volume = 0;
        a.play().catch(() => {});
      } catch {}
      // Toca um som real (baixo) pra confirmar que ativou — feedback tátil
      playSynth("reaction", 0.6);
    }
  }

  if (!hydrated) return null;

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
