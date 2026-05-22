import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Libera o dev server pra hosts da LAN (teste em celular na mesma WiFi).
  // Sem isso, Next bloqueia HMR/RSC de origens "estranhas" ao localhost.
  allowedDevOrigins: ["192.168.1.61"],
};

// Wrap com Sentry — só aplica de fato em produção (DSN ausente desativa).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    treeshake: { removeDebugLogging: true },
    reactComponentAnnotation: { enabled: false },
    automaticVercelMonitors: false,
  },
});
