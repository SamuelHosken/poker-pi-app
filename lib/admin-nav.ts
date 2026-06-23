/**
 * Retorna o href de navegação mais específico que casa com o pathname atual
 * (rota exata ou prefixo `href + "/"`), ou null. A "mais específica ganha"
 * resolve o conflito entre /admin/events e /admin/events/lixeira.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (best === null || href.length > best.length) best = href;
    }
  }
  return best;
}
