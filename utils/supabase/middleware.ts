import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * V1.2 — Refresca sessão Supabase + auth gate inteligente.
 *
 * Regras:
 *   - /admin/login: público (acessível por qualquer um)
 *   - /admin/* (não login): exige user E profile.is_admin=true
 *   - /me: exige user (qualquer profile)
 *   - Logado em /admin/login: redirect smart (admin → /admin/events, senão → /me)
 *
 * IMPORTANTE: não inserir lógica entre `createServerClient` e `getUser`
 * (per Supabase docs — quebra refresh de cookies).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname.startsWith("/admin/login");
  const isMeRoute = pathname.startsWith("/me");

  // Sem auth: bloqueia /admin/* e /me
  if (!user) {
    if ((isAdminRoute && !isLoginRoute) || isMeRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // User logado — pode precisar checar is_admin.
  // Otimização: só query profiles quando necessário (login route ou admin route).
  if (isLoginRoute || (isAdminRoute && !isLoginRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin = profile?.is_admin ?? false;

    if (isLoginRoute) {
      // Logado tentando ver login: manda pra destino certo
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin/events" : "/me";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && !isAdmin) {
      // Logado mas não admin tentando acessar /admin/*
      const url = request.nextUrl.clone();
      url.pathname = "/me";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
