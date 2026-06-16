/**
 * Vídeo-convite que abre ao tocar na moeda do hero.
 *
 * ⬇️  COLE AQUI O LINK DO NOVO VÍDEO  ⬇️
 * Suporta link do YouTube, do Vimeo ou um arquivo direto (.mp4 / .webm / .mov).
 * Deixe "" (vazio) enquanto não tiver o link — a moeda mostra "vídeo em breve".
 *
 * Obs.: no site principal do PokerPi o vídeo-convite foi hospedado no **Mux**
 * (player @mux/mux-player-react). Aqui usamos um link simples; se quiser manter
 * o Mux, gere a URL pública do player do Mux e cole abaixo.
 */
export const CONVITE_VIDEO_URL = "";

export type VideoSource =
  | { kind: "youtube" | "vimeo" | "iframe"; src: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

/** Detecta o tipo do link e devolve a fonte pronta pra tocar. */
export function parseVideoSource(raw: string): VideoSource {
  const url = raw.trim();
  if (!url) return { kind: "none" };

  // YouTube
  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt?.[1]) {
    return {
      kind: "youtube",
      src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`,
    };
  }

  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm?.[1]) {
    return {
      kind: "vimeo",
      src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&playsinline=1`,
    };
  }

  // Arquivo de vídeo direto
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) {
    return { kind: "file", src: url };
  }

  // Fallback: trata como embed genérico (iframe)
  return { kind: "iframe", src: url };
}
