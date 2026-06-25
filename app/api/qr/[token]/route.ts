import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/**
 * Gera o QR Code (PNG) do ingresso, codificando a URL pública
 * `/ingresso/[token]`. Usada no e-mail (Gmail bloqueia data: URI em <img>,
 * então servimos como URL real). Sem segredo: o token já é a credencial
 * pública do ingresso.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const target = `${siteUrl}/ingresso/${token}`;
  const png = await QRCode.toBuffer(target, {
    width: 440,
    margin: 1,
    color: { dark: "#0a0a0c", light: "#ffffff" },
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
