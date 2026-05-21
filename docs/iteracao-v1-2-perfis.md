# Iteração V1.2 — Perfis Cadastrados + Self-Service de Mesa

> Data: 2026-05-21
> Branch: `iteracao-v1.2-perfis`
> Status: código completo, **aguardando validação E2E browser**

---

## Visão geral

V1.2 introduz **profiles** (cadastro de pessoas com login email/senha) e **self-service de mesa** (player loga e clica em mesa pra entrar). Substitui o fluxo de "admin digita nome do jogador" por "admin escolhe de perfis cadastrados".

---

## O que foi ADICIONADO

### Schema (migration 0003)
- Nova tabela `public.profiles(id=auth.users.id, name, nickname, is_admin, created_at, updated_at)`. 1:1 com `auth.users`.
- Trigger `handle_new_user` cria profile automaticamente quando admin cria user via Admin API (lê `raw_user_meta_data` pra puxar name/nickname/is_admin).
- Backfill: todos os `auth.users` existentes viram profile com `is_admin=true` (eram admins até agora).
- `players.profile_id` FK nullable → `profiles(id)` ON DELETE SET NULL. Permite "convidado avulso" (legado).
- RLS:
  - `profiles_select_authenticated`: qualquer logado lê todos (admin precisa ver lista; player vê o próprio)
  - `profiles_self_update`: player atualiza o próprio (name/nickname)
  - `profiles_admin_modify`: admin CUD todos
  - `players_self_update`: player atualiza o próprio (state, etc.) — auth.uid() = players.profile_id
  - `participations_self_insert/update`: player insere/atualiza participation próprias
- Realtime publication: `profiles` adicionada

### Server Actions (lib/tournament/)
- `profiles.ts`:
  - `createProfile({ email, password, name, nickname, isAdmin })` — usa service role pra criar auth.user; trigger cria profile
  - `listProfiles()` / `getProfile(id)` / `getMyProfile()`
  - `updateProfile(input)` / `setAdminFlag(profileId, isAdmin)`
  - `deleteProfile(profileId)` — deleta auth.user (cascade pra profile)
- `auth.ts`:
  - `requireAdmin()` agora valida `profile.is_admin = true` (não só user existir)
  - `getCurrentUserAndProfile()` — soft fetch pra UIs decidirem destino
- `players.ts`:
  - `createPlayer` aceita opcional `profileId` (puxa name/nickname do profile)
  - `listProfilesAvailableForEvent(eventId)` — profiles que AINDA NÃO estão no evento (pro dropdown)
- `player-actions.ts` (novo):
  - `joinTableAsPlayer(physicalTableId)` — player se auto-junta a mesa. Cria match se mesa LIVRE.
  - `leaveCurrentTable()` — sai da mesa atual (delete participation, player → PRESENTE)
  - `getMyEvents()` — eventos onde o user tem player + tables + my current location

### UI Admin (/admin/)
- `/admin/profiles` — lista de perfis com toggle admin + delete
- `/admin/profiles/new` — form de cadastro (email, senha, nome, apelido, is_admin checkbox)
- Nav atualizada no `admin/layout.tsx`: links pra "Eventos" e "Perfis"
- `PlayersSection` no detalhe do evento: **dropdown de profiles disponíveis** substitui input livre de nome. Link "Cadastrar nova pessoa" no rodapé.

### UI Player (/me)
- `/me` — Server Component, mostra:
  - Olá + nome + apelido
  - Aviso "Você é admin" com link pro painel (se aplicável)
  - Lista de eventos onde o user é player
  - Pra cada evento ATIVO, lista de mesas com botões "Entrar" / "Você está aqui · Sair" / "Saia da mesa atual"
- `TableActions` (client) — botões de join/leave com toast feedback
- `LogoutMeButton` (client) — invoca `logoutAction`

### Auth gate (utils/supabase/middleware.ts)
- `/admin/login`: público
- `/admin/*` (exceto login): user + `is_admin=true`. Não-admin logado vai pra `/me`
- `/me`: qualquer user logado
- Login form redireciona inteligente: admin → `/admin/events`, senão → `/me`

---

## O que foi MODIFICADO

- `lib/types/domain.ts` — sem mudanças
- `lib/types/schemas.ts` — novos: `CreateProfileSchema`, `UpdateProfileSchema`, `JoinTableSchema`. `CreatePlayerSchema` ganhou `profileId` opcional
- `lib/types/database.types.ts` — regenerado (adicionou `profiles` table)
- `app/admin/login/actions.ts` — redirect smart baseado em `profile.is_admin`
- `app/admin/events/[id]/page.tsx` — fetch + passa `availableProfiles` pra PlayersSection
- `app/admin/events/[id]/players-section.tsx` — UI nova com dropdown de profiles
- `app/admin/layout.tsx` — nav com links pra Eventos + Perfis
- `lib/tournament/auth.ts` — `requireAdmin` agora valida `profile.is_admin`
- `utils/supabase/middleware.ts` — gate refinado pra admin + me

---

## Migration aplicada

`supabase/migrations/0003_v1_2_profiles.sql` aplicada via `supabase db push` em 2026-05-21.

**Backfill verificado:** admin existente (`samuelhosken.o@gmail.com`) tem profile com `is_admin=true`. Confirmado via REST API:

```json
[{"id":"358517df-...", "name":"samuelhosken.o", "is_admin":true}]
```

---

## Modelo conceitual

```
auth.users (Supabase Auth — email + senha)
   │ 1:1 (id compartilhado)
   ▼
profiles (name, nickname, is_admin, created_at, updated_at)
   │ 0..N (via players.profile_id)
   ▼
players (event_id, name, nickname, profile_id, state, ...)
   │ 0..N
   ▼
participations (match_id, player_id, seat_number, eliminated_at)
```

- 1 profile pode ser player em vários eventos (1 player row por evento)
- 1 player pode ter no máx. 1 participação ativa (eliminated_at IS NULL) por vez (regra V1.2)

---

## Fluxos novos

### Cadastrar pessoa nova (admin)
1. `/admin/profiles/new`
2. Preenche email + senha + nome + apelido + is_admin
3. Submit → `createProfile` → auth.users + trigger cria profile
4. Redirect `/admin/profiles`

### Adicionar pessoa em um evento (admin)
1. `/admin/events/[id]` (Credenciamento ou Em andamento)
2. Dropdown lista profiles ainda não no evento
3. Escolhe + "Adicionar ao evento"
4. `createPlayer({ profileId })` cria player linkado

### Player entra em mesa (self-service)
1. Player loga em `/admin/login` (não-admin → redirect `/me`)
2. Vê eventos onde está + mesas
3. Clica "Entrar" numa mesa
4. `joinTableAsPlayer(physicalTableId)`:
   - Cria match se mesa LIVRE (state JOGANDO, level_started_at=now)
   - Insere participation com cadeira sorteada
   - player.state = JOGANDO
5. Botão muda pra "Você está aqui · Sair"

### Player muda de mesa
1. Tem que sair da atual primeiro: clica "Sair"
2. `leaveCurrentTable`: delete participation, player.state = PRESENTE
3. Agora pode clicar "Entrar" em outra mesa

---

## Critérios de aceitação atendidos

- ✅ `npm run build` passa
- ✅ `npx tsc --noEmit` passa (zero erros)
- ✅ `npm run lint` passa (zero warnings)
- ✅ `npm test` passa (16/16)
- ✅ Zero `any` em código novo
- ✅ Migration 0003 aplicada
- ✅ `/admin/profiles` lista, cria, toggle admin, delete
- ✅ Login redireciona admin → admin, player → /me
- ✅ /admin/* bloqueado pra não-admin (redirect /me)
- ✅ /me bloqueado pra não-logado (redirect /admin/login)
- ✅ Player consegue entrar em mesa pelo /me
- ✅ Player consegue sair de mesa
- ✅ Compat com convidados antigos (players sem profile_id renderizam com label "convidado")
- ⚠️ **Validação E2E browser: pendente**

---

## Smoke test sugerido

```bash
npm run dev
```

```
1. Login como admin (samuelhosken.o@gmail.com)
2. Vai pra /admin/profiles → vê o próprio profile como admin
3. "+ Cadastrar pessoa" → cria "Bob Tester" (bob@test.com / senha123, NÃO admin)
4. Volta pra /admin/profiles → vê Bob como "Jogador"
5. Vai pra /admin/events → cria evento novo
6. Detalhe do evento → "Avançar para Credenciamento"
7. Em PlayersSection: dropdown mostra "Bob Tester" → adiciona
8. Logout
9. Login como Bob (bob@test.com / senha123)
10. Deveria ir AUTOMATICAMENTE pra /me (não /admin)
11. /me mostra o evento que admin criou + Bob como PRESENTE
12. Admin avança evento pra "Em andamento" em outra aba/sessão
13. Bob refresca /me → mesas aparecem
14. Bob clica "Entrar" na Mesa 1 → mesa vira JOGANDO
15. TV em /tv/[eventId] mostra Bob na mesa
16. Bob clica "Sair" → volta a PRESENTE
17. Outro player (criar mais profiles + adicionar) também entra → cronômetro continua rodando da hora que primeiro entrou
```

---

## Limitações conhecidas

1. **Match.LIVRE → JOGANDO acontece SEM admin envolvido** quando primeiro player entra. Admin perdeu visibilidade de "quando começou a partida". OK pra V1.2 (cash-game model).
2. **Sem rate limit no `joinTableAsPlayer`** — player pode pular entre mesas rapidamente. Em UX real, OK.
3. **`leaveCurrentTable` deleta participation** — sem histórico do tempo que ficou. Pra V1.2 simples, OK. V1.3 podia adicionar `left_at`.
4. **2 queries DB no middleware** pra rotas `/admin/*` — 1 getUser + 1 profile.is_admin. Custo aceitável pra carga baixa.
5. **`/admin/login` ainda é o único login route** — `/login` genérico não foi criado. URL antiga continua funcionando, redirect smart.
6. **Convidados antigos** (`profile_id` null) continuam aparecendo com label "convidado", mas não conseguem fazer login. Compat preservada.

---

## Próximo: V1.3 (futuro)

Ideias mencionadas no plano original que ainda não foram feitas:
- Botão "Mostrar fichas no telão" (player digita valor, aparece na TV por X segundos)
- Histórico de tempo em mesa por player (left_at column)
- WhatsApp integration (Twilio)
