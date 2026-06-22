// =========================================================================
// GERADO AUTOMATICAMENTE por scripts/upload-convites.mjs — NÃO editar à mão.
// Mapa slug → vídeo-convite personalizado (hospedado no Cloudinary).
// Rode o script de novo pra regenerar depois de subir/trocar vídeos.
// =========================================================================

export type Convite = {
  /** Nome da pessoa (interno — não aparece pro visitante). */
  name: string;
  /** public_id do vídeo no Cloudinary. */
  publicId: string;
};

export const CONVITES: Record<string, Convite> = {
  "akin": { name: "Akin", publicId: "convites/akin" },
  "davi": { name: "Davi", publicId: "convites/davi" },
  "guilherme": { name: "Guilherme", publicId: "convites/guilherme" },
  "henrique": { name: "Henrique", publicId: "convites/henrique" },
  "leo": { name: "Léo", publicId: "convites/leo" },
  "luciano": { name: "Luciano", publicId: "convites/luciano" },
  "marcos": { name: "Marcos", publicId: "convites/marcos" },
  "murilo": { name: "Murilo", publicId: "convites/murilo" },
  "nesrrala": { name: "Nesrrala", publicId: "convites/nesrrala" },
  "nicolas": { name: "Nicolas", publicId: "convites/nicolas" },
  "pedro": { name: "Pedro", publicId: "convites/pedro" },
  "rafael": { name: "Rafael", publicId: "convites/rafael" },
  "rafik": { name: "Rafik", publicId: "convites/rafik" },
  "ramon": { name: "Ramon", publicId: "convites/ramon" },
  "vinicius": { name: "Vinícius", publicId: "convites/vinicius" },
};

/** Retorna o convite de um slug, ou null se não existir. */
export function getConvite(slug: string): Convite | null {
  return CONVITES[slug] ?? null;
}
