import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * V1.3 — Middleware otimizada.
 *
 * O QUE FAZ AQUI (fast path, sem network):
 *   - Lê a sessão do cookie via `getSession()` (zero round-trip ao Supabase —
 *     cookie é assinado pelo Supabase no login, conteúdo é confiável).
 *   - Sem sessão + rota protegida → redirect pra /admin/login.
 *   - Mantém os cookies sincronizados na resposta (necessário pro refresh
 *     automático funcionar nas próximas requests).
 *
 * O QUE NÃO FAZ MAIS AQUI (movido pras páginas):
 *   - Checagem de `profile.is_admin` (uma round-trip extra que custava ~350ms
 *     por request). Agora vive em `/admin/layout.tsx` (gate admin) e
 *     `/me/page.tsx` (redirect admin → /admin/events).
 *   - Páginas usam `getCurrentUserAndProfile()` que é cacheado via React.cache
 *     por request, então não duplica trabalho dentro de um render.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getSession() lê do cookie local + refresca se token expira em <10s.
  // Não faz round-trip de validação como getUser().
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname.startsWith("/admin/login");
  // V1.3: rotas públicas pra recuperação de senha
  const isPublicAuthRoute =
    isLoginRoute ||
    pathname.startsWith("/admin/forgot-password") ||
    pathname.startsWith("/admin/reset-password");
  const isMeRoute = pathname.startsWith("/me");

  // Sem auth: bloqueia /admin/* (exceto rotas públicas de auth) e /me
  if (!user && ((isAdminRoute && !isPublicAuthRoute) || isMeRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // O resto (admin acessando /me, player acessando /admin/*, login redirect)
  // é tratado nas próprias páginas via getCurrentUserAndProfile() — evita
  // round-trip extra no fast path da middleware.
  return supabaseResponse;
}
