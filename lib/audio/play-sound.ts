/**
 * Helper de áudio pra a TV.
 *
 * Som só toca depois do usuário clicar em "Ativar som" (autoplay policy).
 * Preferência persistida em localStorage com a chave `pokerpi:sound-on`.
 */

const STORAGE_KEY = "pokerpi:sound-on";

export type SoundName =
  | "elimination"
  | "match-finish"
  | "calling"
  | "champion"
  | "level-up"
  | "draw-tick"
  | "draw-stop";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent("pokerpi:sound-changed", { detail: on }));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

export function playSound(name: SoundName, volume = 0.7): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {
      /* arquivo vazio ou autoplay residual — ignora */
    });
  } catch {
    /* sem suporte a Audio — ignora */
  }
}
