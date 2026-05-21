import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#c9a961",
          fontSize: 132,
          fontWeight: 300,
          letterSpacing: "-0.04em",
          fontFamily: "serif",
        }}
      >
        π
      </div>
    ),
    { ...size },
  );
}
