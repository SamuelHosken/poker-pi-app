import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Pi",
    short_name: "Poker Pi",
    description: "Sistema de gestão de torneio de poker presencial.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#c9a961",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    lang: "pt-BR",
    categories: ["games", "utilities"],
  };
}
