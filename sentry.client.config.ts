import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Captura todos os erros não-tratados; em dev fica silencioso
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1, // 10% das transações pra performance
    replaysSessionSampleRate: 0, // session replay desativado por privacidade
    replaysOnErrorSampleRate: 1.0, // captura replay só quando há erro
  });
}
