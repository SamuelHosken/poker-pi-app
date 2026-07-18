# Code review poker-pi-app - 2026-07-18

Revisao automatica multi-agente (padrao code-review-excellence). App de ingressos/vendas: checkout Asaas, check-in, TV, admin.

Achados critical/high foram verificados de forma adversarial (releitura do codigo real); os demais estao marcados UNVERIFIED e valem uma segunda olhada antes de agir.

**Resumo:** 1 critico, 2 alto, 5 medio, 3 baixo. 4 confirmados na verificacao.

| # | Sev | Verificacao | Arquivo | Problema |
|---|-----|-------------|---------|----------|
| 1 | CRITICO | CONFIRMED | `lib/tournament/auth.ts:73` | Admin/authorization gate trusts unverified getSession() cookie, allowi |
| 2 | ALTO | CONFIRMED | `app/admin/layout.tsx:22` | Layout do /admin só checa autenticacao, nao is_admin - jogador comum a |
| 3 | ALTO | CONFIRMED | `lib/tickets/webhook-deps.ts:56` | Refund/chargeback webhook silently fails: 'refunded' violates the tick |
| 4 | MEDIO | CONFIRMED | `app/admin/dashboard/page.tsx:86` | Dashboard de receita/analytics sem nenhum gate de admin (nem na pagina |
| 5 | MEDIO | UNVERIFIED | `lib/rate-limit/in-memory.ts:18` | In-memory rate limiter is effectively a no-op on Vercel, leaving the c |
| 6 | MEDIO | UNVERIFIED | `lib/tickets/webhook-deps.ts:58` | markPaid race: concurrent paid events cause double confirmation email  |
| 7 | MEDIO | UNVERIFIED | `lib/tickets/webhook.ts:65` | CHECKOUT_PAID path skips the Asaas re-verification that the payment pa |
| 8 | MEDIO | UNVERIFIED | `utils/supabase/middleware.ts:25` | Auth middleware is never wired - updateSession is dead code and no edg |
| 9 | BAIXO | UNVERIFIED | `app/api/auto-advance/route.ts:25` | Public unauthenticated endpoint performs service-role full-table scans |
| 10 | BAIXO | UNVERIFIED | `components/tv/event-tv.tsx:374` | Toast de eliminação nunca sai do state sob atividade contínua porque d |
| 11 | BAIXO | UNVERIFIED | `lib/tickets/checkin.ts:47` | Check-in concorrente do mesmo QR cria linhas de player duplicadas |

---

## 1. [CRITICO] Admin/authorization gate trusts unverified getSession() cookie, allowing forged-cookie privilege escalation

- **Arquivo:** `lib/tournament/auth.ts:73`
- **Categoria:** auth-bypass  |  **Fatia:** infra  |  **Verificacao:** CONFIRMED

**O que e:** The entire auth model rests on getCurrentUserId() (lines 16-23), which calls supabase.auth.getSession(). In @supabase/ssr / auth-js 2.106, getSession() reads the session directly from the request cookie and does NOT verify the JWT signature - the installed auth-js source itself carries the explicit warning: 'If using an insecure storage medium, such as cookies or request headers, the user object returned by this function must not be trusted. Always verify the JWT using getClaims() or getUser().' requireAdmin() (line 73) takes that unverified userId and looks up profiles.is_admin with a service_role client (profileLookupClient), then every admin Server Action uses adminServiceClient()/rawServiceClient() which bypass RLS entirely. getCurrentUserId() is also the identity source for all player actions (lib/tournament/player-actions.ts:41,243,289,394,582,746). The @supabase/ssr cookie storage stores the session as JSON (access_token, expires_at, user{id}) and getSession returns session.user.id without cryptographic validation.

**Cenario de falha:** An unauthenticated attacker sets the sb-<ref>-auth-token cookie to a hand-crafted JSON session with a far-future expires_at and user.id equal to a known admin's UUID (discoverable via gallery uploads/action_log/etc). requireAdmin() reads is_admin=true for that UUID and grants full RLS-bypassing service_role write access to every event, blind level, and player. With any other user's UUID the same trick impersonates that player in /me and player actions - a complete authentication bypass requiring no credentials.

**Correcao sugerida:** Do not authorize on getSession() in server code. Use supabase.auth.getUser() (round-trips to the Auth server) or getClaims() (verifies the JWT signature against the JWKS/signing key) to establish identity before any privileged lookup or service_role write. Cache the getUser()/getClaims() result per-request via React.cache to keep the latency cost to one call per render, but never derive admin/identity from getSession().

**Nota da verificacao:** The full exploit path is verified in real code. getCurrentUserId() (lib/tournament/auth.ts:16-23) trusts supabase.auth.getSession(), and in the installed @supabase/auth-js 2.106.1 getSession()->__loadSession() (GoTrueClient.js:2324) never verifies the JWT signature: _isValidSession (line 3785) is purely structural and expiry is read from the attacker-controlled cookie's own expires_at (line 2350). The @supabase/ssr cookie storage (cookies.js:13-33) merely base64url-decodes and JSON.parses the cookie with no HMAC on the wrapper, so an attacker fully controls the session JSON via sb-<ref>-auth-token. requireAdmin() (auth.ts:73) passes that unverified userId to a service_role profileLookupClient() is_admin lookup and admin actions use RLS-bypassing service_role clients. No getUser()/getClaims() exists anywhere in the auth path; middleware (utils/supabase/middleware.ts:47) and app/admin/layout.tsx:22 also rely solely on getSession()/getCurrentUserId(). Forging the cookie with a known admin UUID yields full RLS-bypassing write access; any other UUID impersonates that player. Reachable in production, not masked by any guard, validation, RLS, or type.

---

## 2. [ALTO] Layout do /admin só checa autenticacao, nao is_admin - jogador comum acessa o painel inteiro

- **Arquivo:** `app/admin/layout.tsx:22`
- **Categoria:** broken-access-control  |  **Fatia:** app-routes  |  **Verificacao:** CONFIRMED

**O que e:** O AdminLayout chama getCurrentUserId() e, se houver QUALQUER usuario logado, renderiza o shell admin (linhas 22-44). Nao ha checagem de profile.is_admin em lugar nenhum do layout. A proxy.ts/middleware tambem so verifica presenca de sessao (updateSession, linha 63: `if (!user && ...)`), com um comentario afirmando que o gate de is_admin foi 'movido pras paginas' - mas a maioria das paginas NAO refaz esse gate. O modelo de dados cria contas de jogador (profiles.is_admin=false) que fazem login em /admin/login e sao redirecionadas pra /me; essas contas tem sessao valida. Varias paginas admin buscam dados via service-role client (bypassa RLS) SEM chamar requireAdmin: getEvent, listPlayersForEvent, getMatchesForEvent, getEliminatedWithRebuyStatus (usadas em /admin/events/[id], /tv, /results) e getDashboard/getDashboardEventId (/admin/dashboard). Nessas rotas o unico gate e o layout, que so exige estar logado. Resultado: qualquer jogador cadastrado ve a lista completa de participantes, controles de partida, receita e analytics.

**Cenario de falha:** Organizador cadastra o jogador Joao em /admin/profiles (is_admin=false). Joao recebe email+senha, loga em /admin/login e cai em /me. Joao digita na URL /admin/dashboard -> ve receita total, funil, origens e atividade recente; digita /admin/events/<id> -> ve todos os participantes e controles do torneio. Nenhum erro e retornado porque getDashboard/getEvent usam service-role e nao validam is_admin, e o layout so exige sessao.

**Correcao sugerida:** Impor o gate de admin no proprio layout: em vez de `const userId = await getCurrentUserId()`, usar `getCurrentUserAndProfile()` e, para rotas nao-publicas (fora de /admin/login, /forgot-password, /reset-password), redirecionar `!isAdmin` para /me. Isso fecha todas as subpaginas de uma vez. Idealmente tambem adicionar requireAdmin() dentro de getEvent/getDashboard/getMatchesForEvent/listPlayersForEvent/getEliminatedWithRebuyStatus como defesa em profundidade, alinhando-as com listEvents/listProfiles/getAllSubscriptions que ja fazem isso.

**Nota da verificacao:** Verified the exact path. app/admin/layout.tsx:22 gates only on getCurrentUserId() presence with no is_admin check (lines 22-44). utils/supabase/middleware.ts:63 gates only on session presence, and its own comment says the is_admin gate was moved to layout.tsx - which never implements it (a V1.3 regression). The named pages app/admin/dashboard/page.tsx and app/admin/events/[id]/page.tsx contain no requireAdmin/getCurrentUserAndProfile/redirect gate. Their loaders bypass RLS: getEvent (lib/tournament/events.ts) uses adminServiceClient() and getDashboard (lib/analytics/dashboard.ts:80) uses rawServiceClient(), neither calling requireAdmin. Non-admin accounts are real login users (profiles.ts:46 createUser with is_admin=false) and login redirects them to /me, so they hold valid sessions that satisfy both the middleware and the layout. Thus any registered non-admin can open /admin/dashboard or /admin/events/<id> and see revenue, analytics, and the full participant list. Not masked by any guard, RLS, or type. Scoping note: mutation server actions still call requireAdmin, so the exposure is read-only (PII + financial data disclosure), not full write control.

---

## 3. [ALTO] Refund/chargeback webhook silently fails: 'refunded' violates the tickets CHECK constraint, so the seat is never released

- **Arquivo:** `lib/tickets/webhook-deps.ts:56`
- **Categoria:** data-loss/money  |  **Fatia:** api  |  **Verificacao:** CONFIRMED

**O que e:** processWebhookEvent handles PAYMENT_REFUNDED / PAYMENT_CHARGEBACK_REQUESTED / PAYMENT_DELETED by calling markRefunded, which runs `db.from("tickets").update({ status: "refunded" })`. But the only status CHECK constraint on the tickets table is in migration 0020_tickets.sql:50 - `check (status in ('pending','paid','canceled'))` - and no later migration adds 'refunded'. So Postgres rejects the UPDATE with error 23514. markRefunded ignores the returned `{ error }` entirely (no throw, no check), so the write is a silent no-op: the ticket stays `paid`, its qr_token remains valid, and processWebhookEvent returns `{ handled: true, reason: 'estornado' }`, so the route answers 200 OK to Asaas. Even if the error were surfaced it would throw a 500 and Asaas would retry forever, still never landing. Either way the refund never releases the seat.

**Cenario de falha:** A buyer pays (ticket becomes paid, valid QR emailed), then requests a refund or files a card chargeback. Asaas sends PAYMENT_REFUNDED. The webhook returns 200, but the DB update is rejected by the CHECK constraint and swallowed → ticket stays status='paid' with a working QR. The buyer gets their money back AND keeps a valid ticket that passes check-in. Direct financial/access loss on every refund and chargeback.

**Correcao sugerida:** Add 'refunded' (and any other webhook statuses used) to the tickets status CHECK constraint via a new migration, e.g. `alter table public.tickets drop constraint tickets_status_check, add constraint tickets_status_check check (status in ('pending','paid','canceled','refunded'))`. Also make markRefunded inspect the returned error and throw on failure so a silent no-op can never masquerade as a handled refund.

**Nota da verificacao:** Verified the exact path. The tickets CHECK constraint (supabase/migrations/0020_tickets.sql:50) allows only 'pending','paid','canceled'; grep across all migrations shows no later migration adds 'refunded'. markRefunded (lib/tickets/webhook-deps.ts:56) runs update({status:'refunded'}) and discards the return - no {error} destructuring, no throw - unlike markPaid just below it which throws on error. processWebhookEvent (lib/tickets/webhook.ts:84-92) reaches markRefunded on PAYMENT_REFUNDED/CHARGEBACK/DELETED and returns {handled:true}, so the route replies 200 and Asaas never retries. Postgres rejects the UPDATE with 23514, silently no-ops, ticket stays 'paid'. Downstream this is load-bearing: checkin.ts:23 gates on status==='paid' (ghost ticket still checks in, qr_token untouched) and reconcile.ts:56 counts status='paid' for capacity (seat never released). No RLS/validation/guard masks it (service client). TicketStatus type (types.ts:22) omits 'refunded', confirming it was never wired in.

---

## 4. [MEDIO] Dashboard de receita/analytics sem nenhum gate de admin (nem na pagina, nem na funcao de dados)

- **Arquivo:** `app/admin/dashboard/page.tsx:86`
- **Categoria:** broken-access-control  |  **Fatia:** app-routes  |  **Verificacao:** CONFIRMED

**O que e:** A DashboardPage renderiza IngressosTab/InscricoesTab que chamam getDashboardEventId()+getDashboard() (lib/analytics/dashboard.ts, linhas 47 e 80). Ambas usam rawServiceClient() (bypassa RLS) e NAO chamam requireAdmin - sao o unico caminho de leitura sensivel do slice admin sem gate proprio em lugar algum. A pagina tambem nao verifica is_admin. Expondo receita total (revenue.totalCents), contagem de pagos, funil de conversao, origens/UTM, dispositivos e atividade recente (plano, ref) de compradores. Diferente de listProfiles/getAllSubscriptions, aqui nao ha segunda linha de defesa: se o gate do layout falhar ou for contornado, os dados vazam.

**Cenario de falha:** Um usuario nao-admin autenticado (conta de jogador criada em /admin/profiles) faz GET /admin/dashboard. getDashboard roda com service-role, ignora RLS e retorna receita, funil e atividade de compra completos, que sao renderizados normalmente sem checar is_admin.

**Correcao sugerida:** Adicionar `await requireAdmin()` no inicio de getDashboardEventId() e getDashboard() em lib/analytics/dashboard.ts (mesmo padrao de getAllSubscriptions). Assim a aba de analytics fica protegida independentemente do gate do layout.

**Nota da verificacao:** Verified the exact code path. Middleware (utils/supabase/middleware.ts:47-67) only blocks unauthenticated requests to /admin/*; any authenticated non-admin (player account from V1.2 profiles/self-join) passes. The middleware comment claims the is_admin gate lives in /admin/layout.tsx, but app/admin/layout.tsx:22-44 only checks getCurrentUserId() (authentication) and uses the profile solely for name/avatar - there is NO is_admin check and no redirect. DashboardPage defaults to the "ingressos" tab, whose IngressosTab calls getDashboardEventId() and getDashboard() (lib/analytics/dashboard.ts:47,80). Both use rawServiceClient() (service-role, RLS bypass) and neither calls requireAdmin. So a logged-in non-admin GETting /admin/dashboard receives and renders revenue.totalCents, paid counts, conversion funnel, source/UTM attribution, devices, and recent purchase activity. This is confirmed as the only sensitive admin read without its own gate: the sibling reads getAllSubscriptions (subscriptions.ts:26), getConviteStatuses (convite-stats.ts:52) and listProfiles (profiles.ts:42) each call requireAdmin(), so the InscricoesTab would throw - but the default IngressosTab leaks. No RLS/type/guard masks it.

---

## 5. [MEDIO] In-memory rate limiter is effectively a no-op on Vercel, leaving the charge-creating ticket endpoint unprotected

- **Arquivo:** `lib/rate-limit/in-memory.ts:18`
- **Categoria:** rate-limiting  |  **Fatia:** infra  |  **Verificacao:** UNVERIFIED

**O que e:** checkRateLimit stores buckets in a process-local Map (line 18). The file's own header notes this only works 'single instance no Mac local' and must be swapped for Upstash Redis 'quando for pro Vercel sério'. Per project memory the app is now live on Vercel (app.mesapigroup.com), where serverless functions are multi-instance and frequently cold-started, so each request may hit a fresh empty Map - the effective limit is roughly N_instances x limit and resets constantly. This guards the money path createTicketOrder (lib/tickets/orders.ts:69, 5/10min) plus public subscribe (app/(public)/inscrever/actions.ts:151) and feedback inserts, so the intended abuse protection is silently near-absent in production.

**Cenario de falha:** An attacker scripts the ticket checkout Server Action; because the limiter buckets don't persist across Vercel instances/invocations, they blow past 5/10min and mass-create ticket orders (DB rows + Asaas customer/charge side effects), spamming records and external API calls with no throttle - while the code path reports a false sense of protection.

**Correcao sugerida:** Move the limiter to a shared store (Upstash Redis / Supabase table with atomic upsert) keyed the same way, or gate the charge-creating endpoint behind a durable counter. At minimum, treat the in-memory limiter as best-effort-only and add a persistent check on the money path.

---

## 6. [MEDIO] markPaid race: concurrent paid events cause double confirmation email and overwrite the emailed QR token

- **Arquivo:** `lib/tickets/webhook-deps.ts:58`
- **Categoria:** idempotency/race  |  **Fatia:** api, lib  |  **Verificacao:** UNVERIFIED

**O que e:** Idempotency relies solely on the read-then-write guard in confirmTicket (`if (ticket.status === 'paid') return`). markPaid then does an UNCONDITIONAL update `update({ status:'paid', ..., qr_token: nanoid(24) }).eq('id', ticketId)` with a freshly generated qr_token each call and no `status='pending'` guard. Two overlapping deliveries both read status!='paid', both run markPaid, both send the email. Realistic concurrency vectors: (a) Asaas commonly fires PAYMENT_CONFIRMED and PAYMENT_RECEIVED for the same charge, both in PAID_EVENTS; (b) the reconcilePendingTickets cron (lib/tickets/reconcile.ts) shares buildWebhookDeps and can run at the same instant a webhook arrives. Because each markPaid regenerates qr_token, the second write also overwrites the token already emailed by the first, invalidating that /ingresso/<token> link.

**Cenario de falha:** PAYMENT_CONFIRMED and PAYMENT_RECEIVED (or webhook + reconcile cron) hit within the same window. Both pass the status guard, both markPaid, buyer receives two confirmation emails with two different QR tokens, and the first token no longer resolves because it was overwritten by the second update.

**Correcao sugerida:** Make markPaid the atomic gate: `update({...}).eq('id', ticketId).eq('status','pending').select()` and only send the email / return the token when a row was actually updated (rowCount > 0). That collapses concurrent confirmations to exactly one email and one stable qr_token.

---

## 7. [MEDIO] CHECKOUT_PAID path skips the Asaas re-verification that the payment path uses, breaking the stated 'even if the token leaks' guarantee

- **Arquivo:** `lib/tickets/webhook.ts:65`
- **Categoria:** auth/anti-forge  |  **Fatia:** api  |  **Verificacao:** UNVERIFIED

**O que e:** The PAID_EVENTS branch (line 73-81) deliberately re-verifies with Asaas via deps.verifyPaymentPaid before confirming, and the code documents the intent: 'mesmo se o token do webhook vazar, ninguem marca pago sem ter pago'. The CHECKOUT_PAID branch (line 65-69) has no such re-verification - it trusts the webhook body outright and calls confirmTicket. So the anti-forge defense-in-depth exists for one flow but not the other. If the ASAAS_WEBHOOK_TOKEN ever leaks, a forged POST `{event:'CHECKOUT_PAID', checkout:{id:'<known>'}}` marks a real ticket paid and emails a valid QR without any payment, whereas the same attacker cannot do it via the payment path because that one calls back to Asaas.

**Cenario de falha:** Webhook token is compromised (log leak, misconfig, shared with legacy app per the project's own '2 webhooks' note). Attacker sends a CHECKOUT_PAID event referencing a checkout id for an unpaid ticket; the ticket flips to paid and a working QR is emailed, with no payment ever made.

**Correcao sugerida:** Mirror the payment path: in the CHECKOUT_PAID branch, resolve the checkout's underlying payment/checkout status via the Asaas API and confirm only when Asaas reports it actually paid, so both flows share the same anti-forge re-verification rather than trusting the webhook body.

---

## 8. [MEDIO] Auth middleware is never wired - updateSession is dead code and no edge auth gate runs

- **Arquivo:** `utils/supabase/middleware.ts:25`
- **Categoria:** auth-config  |  **Fatia:** infra  |  **Verificacao:** UNVERIFIED

**O que e:** utils/supabase/middleware.ts exports updateSession() (the edge auth-redirect + Supabase cookie-refresh logic), but there is no root middleware.ts/src middleware.ts, and updateSession has no caller anywhere in the source tree. The build confirms it: .next/server/middleware-manifest.json has "middleware": {} and "sortedMiddleware": [] (the .next/server/middleware.js is a stale, empty artifact). So in production no Next.js middleware executes: unauthenticated requests to /admin/* and /me are not redirected at the edge, and Supabase's server-side session-cookie refresh (the mechanism this file was written to provide) never runs. All auth enforcement now depends on each individual page/layout/action remembering to call requireAdmin()/getMyProfile().

**Cenario de falha:** A new or refactored protected route/Server Action that forgets to call requireAdmin() is fully exposed, since there is no middleware backstop that the code comments assume exists. Separately, because server-side token refresh never runs, a session whose access token expires while only server components are hit cannot persist a refreshed cookie (server.ts setAll is swallowed), risking spurious logouts.

**Correcao sugerida:** Either add a real root middleware.ts that calls updateSession() with an appropriate matcher (restoring the edge redirect + cookie refresh), or, if the move-to-pages decision was intentional, delete the dead utils/supabase/middleware.ts and its misleading comments and confirm every protected page/action has an explicit server-side gate.

---

## 9. [BAIXO] Public unauthenticated endpoint performs service-role full-table scans on every request with no rate limiting

- **Arquivo:** `app/api/auto-advance/route.ts:25`
- **Categoria:** rate-limiting/dos  |  **Fatia:** api, infra  |  **Verificacao:** UNVERIFIED

**O que e:** GET/POST /api/auto-advance is intentionally unauthenticated and uses the SUPABASE_SERVICE_ROLE_KEY to query all auto-advance events, all their JOGANDO matches, and all related blind_levels on every call. The idempotency argument is sound (an attacker cannot force a premature blind advance because each match is gated by calculateTimeRemainingMs), so there is no state-corruption vector. However, with no auth and no rate limit, anyone can hammer the route to force repeated multi-table scans under the service role, an amplification vector for DB load / cost.

**Cenario de falha:** A script issues thousands of requests/sec to /api/auto-advance; each triggers several service-role queries across events, matches, and blind_levels, driving Supabase load and Vercel function invocations with no throttle.

**Correcao sugerida:** Keep it public for the cron/TV use case but add a lightweight guard: a shared cron secret header for the Vercel cron, and/or a short per-IP rate limit (or an in-process throttle that early-returns if it ran within the last few seconds), so the full scan cannot be triggered arbitrarily fast.

---

## 10. [BAIXO] Toast de eliminação nunca sai do state sob atividade contínua porque dismissToast é recriado a cada render

- **Arquivo:** `components/tv/event-tv.tsx:374`
- **Categoria:** state-leak  |  **Fatia:** components  |  **Verificacao:** UNVERIFIED

**O que e:** `dismissToast` é declarada inline no corpo de EventTV (nova referência a cada render) e passada como `onDismiss` para cada EliminationToast. O effect do EliminationToast (components/tv/elimination-toast.tsx:20) tem `[data.id, onDismiss]` como dependências, então toda vez que EventTV re-renderiza o effect faz cleanup + reinicia o setTimeout de 4s. EventTV re-renderiza em cada mensagem Realtime e sempre que `reactions` muda (useReactions atualiza a cada reação e a cada expiração de TTL). Durante um momento movimentado (várias reações/eliminações), o timer de 4s é reiniciado antes de completar, então onDismiss nunca dispara e a entrada permanece no array `toasts` para sempre. Visualmente o node fica invisível (CSS `fade-out ... forwards` zera a opacidade aos 4s), então não há impacto visível, mas o array `toasts` cresce monotonicamente durante a sessão da TV (nodes fixed, opacity:0, pointer-events-none acumulam).

**Cenario de falha:** Durante a mesa final com jogadores mandando reações a cada ~1-2s: um jogador é eliminado -> toast montado -> a cada reação EventTV re-renderiza -> onDismiss muda de referência -> o setTimeout de 4s reinicia antes de 4s -> o toast nunca é removido de `toasts`; ao longo da noite o array só cresce (nodes invisíveis acumulados no container fixo).

**Correcao sugerida:** Estabilizar o callback: `const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);` (ou remover `onDismiss` das deps do effect em EliminationToast usando uma ref). Assim o timer de 4s roda uma vez por toast e a remoção do state acontece de forma confiável.

---

## 11. [BAIXO] Check-in concorrente do mesmo QR cria linhas de player duplicadas

- **Arquivo:** `lib/tickets/checkin.ts:47`
- **Categoria:** idempotency-race  |  **Fatia:** lib  |  **Verificacao:** UNVERIFIED

**O que e:** checkInTicket lê ticket.checked_in_at e, se null e sem player_id, faz INSERT em players (sem constraint/guard) e depois UPDATE do ticket. Não há atomicidade entre a leitura de checked_in_at e o insert do player. Duas leituras concorrentes do mesmo ticket ainda-não-conferido inserem dois players para o mesmo ingresso - não há unique tie de players ao ticket, e o UPDATE do ticket não é condicionado a checked_in_at IS NULL.

**Cenario de falha:** Dois dispositivos na portaria (ou double-tap) escaneiam o mesmo QR no mesmo instante: ambos leem checked_in_at=null e player_id=null, ambos inserem um player PRESENTE no evento → jogador fantasma duplicado na lista do evento; o segundo UPDATE também sobrescreve player_id.

**Correcao sugerida:** Condicionar o UPDATE do ticket a .is('checked_in_at', null) e .select(); se afetar 0 linhas, tratar como 'already'. Só criar o player quando o UPDATE de check-in vencer a corrida (mover a criação para depois do UPDATE condicional bem-sucedido), garantindo um único player por ingresso.

---
