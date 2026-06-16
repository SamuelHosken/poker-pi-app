/**
 * Vídeo-convite que abre ao tocar na moeda do hero.
 *
 * Hospedado no **Cloudinary** (tier grátis, sem propaganda, sem o limite de
 * 10 vídeos do Mux). O player oficial do Cloudinary é embutido via iframe e
 * só precisa de valores PÚBLICOS: o cloud name + o public_id do vídeo.
 *
 * Para trocar o vídeo geral: suba no Cloudinary e troque o CONVITE_PUBLIC_ID.
 * Deixe "" (vazio) pra mostrar o estado "vídeo em breve".
 *
 * (As credenciais secretas — API key/secret — ficam no .env e são usadas só
 *  pelo script de upload, nunca no client.)
 */
export const CLOUDINARY_CLOUD_NAME = "dolxad4w1";

export const CONVITE_PUBLIC_ID = "PokerV2Pos_tdze4t";

/** Monta a URL do player embutível do Cloudinary pra um public_id. */
export function cloudinaryPlayerUrl(publicId: string): string {
  const params = new URLSearchParams({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    public_id: publicId,
  });
  return `https://player.cloudinary.com/embed/?${params.toString()}`;
}
