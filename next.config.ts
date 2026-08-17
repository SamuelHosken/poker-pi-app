import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Libera o dev server pra hosts da LAN (teste em celular na mesma WiFi).
  // Sem isso, Next bloqueia HMR/RSC de origens "estranhas" ao localhost.
  allowedDevOrigins: ["192.168.1.61"],

  /*
    A LP `/pokerpi` saiu do ar em 12/08/2026, e passa a levar para a edicao que
    vale, em `mesapigroup.com/3edicao`.

    Por que ela nao podia continuar viva: ela resolve o evento por `sales_open`,
    entao no instante em que a 3a edicao abrir a venda ela voltaria a vender
    sozinha, com a marca morta "Poker Pi" e oferecendo cartao numa edicao que so
    aceita Pix. Duas paginas vendendo a mesma coisa, com regras diferentes.

    O CODIGO DELA NAO FOI APAGADO, de proposito: `app/(public)/pokerpi/` continua
    inteiro no repositorio, com o hero, a premiacao no scroll, a galeria e o
    FAQ. E design pago e guardado, e mais de uma peca dali ainda vai ser
    reaproveitada. Para ve-la de novo, basta apagar este bloco.

    Temporario (`permanent: false`) porque redirecionamento definitivo fica
    gravado no navegador de quem visitou, e desfazer depois deixa gente presa.
  */
  async redirects() {
    return [
      {
        source: "/pokerpi",
        destination: "https://www.mesapigroup.com/3edicao",
        permanent: false,
      },
      {
        source: "/pokerpi/:caminho*",
        destination: "https://www.mesapigroup.com/3edicao",
        permanent: false,
      },
    ];
  },
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
