/**
 * Vídeo-convite que abre ao tocar na moeda do hero.
 *
 * Hospedado no **Cloudinary** (tier grátis, sem propaganda, sem o limite de
 * 10 vídeos do Mux). Tocamos num <video> nativo com a URL de entrega
 * OTIMIZADA do Cloudinary (`f_auto,q_auto` + largura limitada) — isso
 * transcoda o 4K pesado pra algo leve e que carrega rápido no celular.
 *
 * Para trocar o vídeo geral: suba no Cloudinary e troque o CONVITE_PUBLIC_ID.
 * Deixe "" (vazio) pra mostrar o estado "vídeo em breve".
 *
 * (As credenciais secretas — API key/secret — ficam no .env e são usadas só
 *  pelo script de upload, nunca no client. cloud name e public_id são
 *  públicos, aparecem na URL de entrega.)
 */
export const CLOUDINARY_CLOUD_NAME = "dolxad4w1";

export const CONVITE_PUBLIC_ID = "PokerV2Pos-Leve_qhbljr";

// Transformações de entrega: formato auto (webm/mp4 conforme o device),
// qualidade auto (reduz bitrate sem perda visível) e largura máx. 1280px
// (c_limit nunca faz upscale). Resultado: o 4K de ~96MB vira poucos MB.
const DELIVERY = "f_auto,q_auto,w_1280,c_limit";

/** URL de entrega otimizada do vídeo (mp4) pra tocar num <video> nativo. */
export function cloudinaryVideoUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${DELIVERY}/${publicId}.mp4`;
}

/** Poster = primeiro quadro do vídeo (so_0), pra pintar algo instantâneo. */
export function cloudinaryPosterUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/so_0,${DELIVERY}/${publicId}.jpg`;
}
