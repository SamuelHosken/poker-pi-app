import { ImageResponse } from "next/og";
import { getActiveEventPublic } from "@/lib/tickets/orders";
import { loadFont } from "../inscrever/og-shared";

// Banner de preview (WhatsApp / Telegram / iMessage) da LP /pokerpi — 1200×630,
// o tamanho que dispara o preview GRANDE. Identidade da LP: creme + vermelho da
// marca + Big Shoulders condensada sobre fundo dark quente. O Next liga este
// arquivo automaticamente ao og:image da rota.

export const alt = "Poker Pi · 2ª Edição · Torneio de Poker em Brasília";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paleta da LP (espelha app/globals.css).
const INK = "#17120f";
const CREAM = "#f4ede1";
const CREAM_SOFT = "#cabfb0";
const RED = "#cd0000";

function fmt(startsAt: string | null): { date: string; time: string } {
  const fallback = { date: "11 de julho", time: "16h" };
  if (!startsAt) return fallback;
  try {
    const d = new Date(startsAt);
    const date = d.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      timeZone: "America/Sao_Paulo",
    });
    return { date, time: "16h" };
  } catch {
    return fallback;
  }
}

export default async function Image() {
  let startsAt: string | null = null;
  let location = "Jardim Botânico · Brasília";
  try {
    const data = await getActiveEventPublic();
    if (data) {
      startsAt = data.event.startsAt;
      location = (data.event.locationText.split("—").pop() ?? location).trim();
    }
  } catch {
    // mantém o fallback
  }
  const { date, time } = fmt(startsAt);

  const heavy = await loadFont("Big Shoulders", 800);
  const fonts = heavy
    ? [{ name: "Big Shoulders", data: heavy, weight: 800 as const, style: "normal" as const }]
    : [];
  const display = heavy ? "Big Shoulders" : "sans-serif";

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
          padding: "64px 72px",
          position: "relative",
        }}
      >
        {/* Brilho vermelho nascendo do canto inferior (luz vinda de baixo) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(70% 80% at 88% 118%, rgba(205,0,0,0.45), rgba(23,18,15,0) 60%)",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: RED,
            fontFamily: display,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: RED }} />
          2ª Edição · Torneio de Poker
        </div>

        {/* Título gigante */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontSize: 188,
              fontWeight: 800,
              lineHeight: 0.86,
              letterSpacing: -2,
              color: RED,
              textTransform: "uppercase",
            }}
          >
            Poker Pi
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1,
              marginTop: 18,
              color: CREAM,
              textTransform: "uppercase",
            }}
          >
            Isso não é uma festa.
          </div>
        </div>

        {/* Rodapé: fatos do evento */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontFamily: display,
            fontSize: 34,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: CREAM,
          }}
        >
          <span>{date}</span>
          <span style={{ color: CREAM_SOFT }}>·</span>
          <span>{time}</span>
          <span style={{ color: CREAM_SOFT }}>·</span>
          <span style={{ color: CREAM_SOFT }}>{location}</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
