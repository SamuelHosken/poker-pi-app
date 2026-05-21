/**
 * Helper de áudio pra a TV.
 *
 * Em Etapa 6, isso vai virar parte do "Ativar som" persistido no localStorage.
 * Por enquanto: play silencioso (catch ignora autoplay block + arquivo vazio).
 */

export type SoundName =
  | "elimination"
  | "match-finish"
  | "calling"
  | "champion"
  | "level-up"
  | "draw-tick"
  | "draw-stop";

export function playSound(name: SoundName, volume = 0.7): void {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {
      /* autoplay bloqueado ou arquivo vazio — ignora */
    });
  } catch {
    /* sem suporte a Audio — ignora */
  }
}
