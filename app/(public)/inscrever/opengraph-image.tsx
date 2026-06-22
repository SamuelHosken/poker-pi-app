import { ImageResponse } from "next/og";
import { INK, GOLD, PAPER, RED, GRAY_SOFT, loadFont } from "./og-shared";

// Banner de preview (WhatsApp / Telegram / iMessage) da landing genérica
// /inscrever — 1200×630, espelha a mensagem do hero. O Next liga este arquivo
// automaticamente ao og:image da rota.

export const alt = "Inscreva-se na nova edição do PokerPi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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

        {/* Bloco central — mensagem do hero */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              color: PAPER,
              fontFamily: displayFont,
              lineHeight: 1,
            }}
          >
            O poker mais
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              fontFamily: displayFont,
              fontSize: 150,
              lineHeight: 1,
              color: GOLD,
              marginTop: 6,
            }}
          >
            irado
            <span style={{ color: RED }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              color: GRAY_SOFT,
              marginTop: 26,
              fontFamily: displayFont,
            }}
          >
            está de volta.
          </div>
        </div>

        {/* Rodapé: CTA + ficha */}
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
              backgroundColor: GOLD,
              borderRadius: 999,
              padding: "20px 40px",
              color: INK,
              fontSize: 28,
              letterSpacing: 1,
            }}
          >
            Garanta seu ingresso
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
