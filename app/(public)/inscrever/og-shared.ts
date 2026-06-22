// Helpers compartilhados pelos banners OG (preview de link no WhatsApp etc.):
//  - /inscrever                  → banner genérico
//  - /convite/[slug]             → banner com o nome da pessoa

// Paleta da marca (espelha app/globals.css).
export const INK = "#0a0a0b";
export const GOLD = "#c9a961";
export const PAPER = "#f5f1e8";
export const RED = "#c8102e";
export const GRAY_SOFT = "#9a9a9f";

/**
 * Carrega uma fonte do Google em TTF (o fetch server-side, sem User-Agent de
 * browser, devolve truetype — que o gerador de imagem entende). Falhou? Retorna
 * null e o caller cai pro serif/sans padrão, sem quebrar a imagem.
 */
export async function loadFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}`;
    const css = await (await fetch(url)).text();
    const match = css.match(/src: url\((.+?)\) format/);
    if (!match?.[1]) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
