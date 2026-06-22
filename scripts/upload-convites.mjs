// =========================================================================
// Upload dos vídeos-convite personalizados pro Cloudinary + geração do mapa.
//
// Sobe cada vídeo (chunked, aguenta arquivos grandes) pra pasta `convites/`
// com um public_id estável = o slug da pessoa. Ao final, ESCREVE sozinho o
// arquivo `app/(public)/inscrever/convites.ts` com o registro slug → vídeo,
// pra não precisar copiar/colar id nenhum.
//
// Rodar:
//   node --env-file=.env.local scripts/upload-convites.mjs
//
// Idempotente: usa overwrite=true; rodar de novo re-sobe e atualiza o mesmo
// public_id (não cria duplicado).
// =========================================================================
import { v2 as cloudinary } from "cloudinary";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// -------------------------------------------------------------------------
// Config: de onde vêm os vídeos e o mapa arquivo → slug + nome.
// -------------------------------------------------------------------------
const SOURCE_DIR = "/Volumes/hskn-SSD/Fazendo/26.06.09 Poker V2/Pessoas certo";

// Pasta no Cloudinary onde os convites ficam organizados.
const CLOUD_FOLDER = "convites";

// arquivo no SSD  →  { slug (vira a URL e o public_id), name (interno) }
const PEOPLE = [
  { file: "Akin.mp4", slug: "akin", name: "Akin" },
  { file: "Davi.mp4", slug: "davi", name: "Davi" },
  { file: "gulherme.mp4", slug: "guilherme", name: "Guilherme" },
  { file: "henrrique.mp4", slug: "henrique", name: "Henrique" },
  { file: "leo.mp4", slug: "leo", name: "Léo" },
  { file: "luciano.mp4", slug: "luciano", name: "Luciano" },
  { file: "Marcos.mp4", slug: "marcos", name: "Marcos" },
  { file: "Murilo.mp4", slug: "murilo", name: "Murilo" },
  { file: "Nesrrala ksfhjdgf.mp4", slug: "nesrrala", name: "Nesrrala" },
  { file: "Nicolas.mp4", slug: "nicolas", name: "Nicolas" },
  { file: "Pedro.mp4", slug: "pedro", name: "Pedro" },
  { file: "Rafael.mp4", slug: "rafael", name: "Rafael" },
  { file: "rafik.mp4", slug: "rafik", name: "Rafik" },
  { file: "Ramon.mp4", slug: "ramon", name: "Ramon" },
  { file: "Vinicios.mp4", slug: "vinicius", name: "Vinícius" },
];

// -------------------------------------------------------------------------
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    "❌ Faltam credenciais do Cloudinary no ambiente.\n" +
      "   Rode com: node --env-file=.env.local scripts/upload-convites.mjs",
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(
  __dirname,
  "..",
  "app",
  "(public)",
  "inscrever",
  "convites.ts",
);

const fmtMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);

async function main() {
  // Pré-checagem: todos os arquivos existem?
  const missing = PEOPLE.filter((p) => !existsSync(join(SOURCE_DIR, p.file)));
  if (missing.length > 0) {
    console.error("❌ Arquivos não encontrados em:\n   " + SOURCE_DIR);
    missing.forEach((p) => console.error("   - " + p.file));
    process.exit(1);
  }

  const totalMB = PEOPLE.reduce(
    (acc, p) => acc + statSync(join(SOURCE_DIR, p.file)).size,
    0,
  );
  console.log(
    `\n📤 Subindo ${PEOPLE.length} vídeos (~${fmtMB(totalMB)} MB) pro Cloudinary` +
      ` "${CLOUD_NAME}" → pasta "${CLOUD_FOLDER}/"\n`,
  );

  const results = [];
  for (const person of PEOPLE) {
    const path = join(SOURCE_DIR, person.file);
    const sizeMB = fmtMB(statSync(path).size);
    process.stdout.write(`  • ${person.slug.padEnd(12)} (${sizeMB} MB) … `);

    try {
      // upload normal (1 requisição) — confiável com promise. Arquivos < 100 MB.
      const res = await cloudinary.uploader.upload(path, {
        resource_type: "video",
        folder: CLOUD_FOLDER,
        public_id: person.slug,
        overwrite: true,
        invalidate: true,
        timeout: 600000, // 10 min por arquivo
      });
      if (!res?.public_id) throw new Error("upload sem public_id na resposta");
      results.push({ ...person, publicId: res.public_id });
      console.log(`✓ (${res.public_id})`);
    } catch (err) {
      console.log("❌");
      console.error(`    erro em ${person.file}: ${err?.message ?? err}`);
      process.exit(1);
    }
  }

  // Verificação: confere no servidor que os 15 estão mesmo no ar.
  console.log("\n🔎 Verificando no Cloudinary…");
  const onServer = new Set();
  let cursor;
  do {
    const page = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: CLOUD_FOLDER + "/",
      max_results: 100,
      next_cursor: cursor,
    });
    page.resources.forEach((r) => onServer.add(r.public_id));
    cursor = page.next_cursor;
  } while (cursor);

  const faltando = results.filter((r) => !onServer.has(r.publicId));
  if (faltando.length > 0) {
    console.error(
      `❌ ${faltando.length} não apareceram no servidor: ` +
        faltando.map((r) => r.slug).join(", "),
    );
    process.exit(1);
  }
  console.log(`   ✓ ${results.length}/${results.length} confirmados no ar.`);

  writeRegistry(results);

  console.log(`\n✅ Pronto. ${results.length} vídeos no ar.`);
  console.log(`   Mapa escrito em: app/(public)/inscrever/convites.ts\n`);
  console.log("🔗 Links pra enviar:");
  results.forEach((r) =>
    console.log(`   ${r.name.padEnd(12)} → /convite/${r.slug}`),
  );
  console.log("");
}

function writeRegistry(rows) {
  const entries = rows
    .map(
      (r) =>
        `  ${JSON.stringify(r.slug)}: { name: ${JSON.stringify(
          r.name,
        )}, publicId: ${JSON.stringify(r.publicId)} },`,
    )
    .join("\n");

  const content = `// =========================================================================
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
${entries}
};

/** Retorna o convite de um slug, ou null se não existir. */
export function getConvite(slug: string): Convite | null {
  return CONVITES[slug] ?? null;
}
`;

  writeFileSync(REGISTRY_PATH, content, "utf8");
}

main();
