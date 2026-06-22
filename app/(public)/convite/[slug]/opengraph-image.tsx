import { ImageResponse } from "next/og";
import { getConvite } from "../../inscrever/convites";
import { INK, GOLD, PAPER, RED, GRAY_SOFT, loadFont } from "../../inscrever/og-shared";

// Banner de preview (WhatsApp / Telegram / iMessage) — 1200×630, o tamanho que
// dispara o preview GRANDE. Gerado por pessoa via o slug; o nome entra no
// template. O Next liga este arquivo automaticamente ao og:image da rota.

export const alt = "Seu convite para a nova edição do PokerPi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const convite = getConvite(slug);
  const name = convite?.name ?? "Você";

  const fraunces = await loadFont("Fraunces", 600);
  const fonts = fraunces
    ? [{ name: "Fraunces", data: fraunces, weight: 600 as const, style: "normal" as const }]
    : [];
  const displayFont = fraunces ? "Fraunces" : "serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Brilho dourado no topo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(201,169,97,0.22), rgba(10,10,11,0) 60%)",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: GOLD,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 56, height: 2, backgroundColor: GOLD }} />
          PokerPi · Nova edição
        </div>

        {/* Bloco central */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 44, color: GRAY_SOFT }}>
            Seu convite,
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              fontFamily: displayFont,
              fontSize: 168,
              lineHeight: 1,
              color: GOLD,
              marginTop: 4,
            }}
          >
            {name}
            <span style={{ color: RED }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              color: PAPER,
              marginTop: 28,
              fontFamily: displayFont,
            }}
          >
            O poker mais irado está de volta.
          </div>
        </div>

        {/* Rodapé: chamada de ação */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              border: `2px solid ${GOLD}`,
              borderRadius: 999,
              padding: "16px 32px",
              color: PAPER,
              fontSize: 26,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 999,
                backgroundColor: GOLD,
              }}
            >
              {/* Triângulo de play em SVG (evita emoji) */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill={INK}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            Assista ao seu convite em vídeo
          </div>

          {/* Ficha de pôquer (canto direito) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 116,
              height: 116,
              borderRadius: 999,
              border: `4px solid ${GOLD}`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 84,
                height: 84,
                borderRadius: 999,
                border: "2px dashed rgba(201,169,97,0.55)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
