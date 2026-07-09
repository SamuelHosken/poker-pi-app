import { trackEvent } from "./track";
import type { SiteEventName } from "./types";

const SID_KEY = "pp_sid";
const ATTR_KEY = "pp_attr";

type Attribution = {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Id anônimo e estável por navegador (não é login, é só pra ligar o funil). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Captura a origem na PRIMEIRA visita (?ref=rafael, ?utm_source=instagram...) e
 * guarda. Visitas seguintes mantêm a primeira origem (first-touch), que é o que
 * importa pra saber quem trouxe a pessoa.
 */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Attribution = {
      ref: params.get("ref") ?? undefined,
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
    const hasUrl = Object.values(fromUrl).some(Boolean);

    const stored = localStorage.getItem(ATTR_KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    if (hasUrl) {
      localStorage.setItem(ATTR_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    return {};
  } catch {
    return {};
  }
}

function getDevice(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/.test(ua)) return "mobile";
  return "desktop";
}

/** Dispara só uma vez por sessão de aba (pra não recontar refresh). */
export function trackOnce(key: string, name: SiteEventName, extra?: TrackExtra): void {
  try {
    const k = `pp_once:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    // segue mesmo sem sessionStorage
  }
  track(name, extra);
}

type TrackExtra = {
  plan?: string;
  eventId?: string;
  meta?: Record<string, unknown>;
};

/** Coleta o contexto do navegador e grava o evento (best-effort). */
export function track(name: SiteEventName, extra?: TrackExtra): void {
  if (typeof window === "undefined") return;
  const attr = getAttribution();
  void trackEvent({
    name,
    sessionId: getSessionId(),
    path: window.location.pathname,
    ref: attr.ref ?? null,
    utmSource: attr.utmSource ?? null,
    utmMedium: attr.utmMedium ?? null,
    utmCampaign: attr.utmCampaign ?? null,
    device: getDevice(),
    referrer: document.referrer || null,
    plan: extra?.plan ?? null,
    eventId: extra?.eventId ?? null,
    meta: extra?.meta ?? null,
  });
}
