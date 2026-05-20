# Poker Pi

Sistema de gestão de torneios presenciais de poker entre amigos.

> Três interfaces sincronizadas em tempo real: painel administrativo, televisão pública e app do jogador.

---

## Sobre

Não é casa de poker online — é ferramenta de apoio logístico a um evento físico real, com cartas e fichas reais. Gerencia cronômetro, blinds, fila de espera, eliminações, classificações e mesa final.

**Caso de uso típico:** festa entre amigos, 30 participantes, 2 mesas físicas de 8 jogadores, torneio com mesa final.

---

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript estrito
- **UI:** Tailwind CSS + shadcn/ui
- **Banco:** Supabase (PostgreSQL gerenciado)
- **Real-time:** Supabase Realtime (WebSockets)
- **Auth:** Supabase Auth
- **Hospedagem:** Vercel

---

## Quick Start

### Pré-requisitos
- Node.js 20+
- npm 10+
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) (pra deploy)
- Supabase CLI: `npm install -g supabase`

### Setup local

```bash
# 1. Clone
git clone https://github.com/SamuelHosken/poker-pi-app.git
cd poker-pi-app

# 2. Instale dependências
npm install

# 3. Configure Supabase
supabase login
supabase link --project-ref <seu-project-ref>

# 4. Configure .env.local
cp .env.local.example .env.local
# Preencha com suas credenciais do Supabase

# 5. Aplique migrations
supabase db push

# 6. Gere tipos
supabase gen types typescript --linked > lib/types/database.types.ts

# 7. Rode
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Criar usuário admin

Por enquanto, criar manualmente via Supabase Dashboard → Authentication → Users → Add user.

(Cadastro via interface fica pra V2.)

---

## Documentação

Toda a documentação técnica e conceitual está em [`docs/`](./docs):

| Arquivo | Pra que serve |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | **Memória persistente.** Leia antes de qualquer sessão. |
| [`docs/00-visao-geral.md`](./docs/00-visao-geral.md) | Visão conceitual do produto |
| [`docs/01-decisoes-fechadas.md`](./docs/01-decisoes-fechadas.md) | Decisões já tomadas, não revisitar |
| [`docs/02-modelo-de-dados.md`](./docs/02-modelo-de-dados.md) | Schema do banco completo |
| [`docs/03-padroes-tecnicos.md`](./docs/03-padroes-tecnicos.md) | Convenções de código |
| [`docs/etapa-*.md`](./docs) | Roteiro de implementação por etapa |
| [`docs/validacao-template.md`](./docs/validacao-template.md) | Template de auditoria |

---

## Estrutura

```
poker-pi-app/
├── CLAUDE.md                  ← memória persistente do projeto
├── README.md                  ← este arquivo
├── docs/                      ← documentação completa
├── app/
│   ├── (admin)/               ← painel administrativo
│   ├── (public)/              ← TV e app do jogador
│   └── api/                   ← endpoints (se houver)
├── components/
│   ├── ui/                    ← primitives shadcn
│   ├── admin/                 ← componentes do admin
│   ├── tv/                    ← componentes da TV
│   └── player/                ← componentes do jogador (V2)
├── lib/
│   ├── supabase/              ← cliente Supabase
│   ├── timer/                 ← cálculo de cronômetro (puro)
│   ├── tournament/            ← Server Actions de domínio
│   └── types/                 ← tipos TypeScript
├── supabase/
│   └── migrations/            ← migrations SQL versionadas
└── public/
    └── sounds/                ← áudio para a TV
```

---

## Scripts disponíveis

```bash
npm run dev          # dev server
npm run build        # build produção
npm start            # rodar build
npm run lint         # ESLint
npx tsc --noEmit     # checar TypeScript

supabase db push     # aplicar migrations
supabase db diff     # checar diferenças entre schema local e remoto
supabase gen types typescript --linked > lib/types/database.types.ts  # gerar tipos
```

---

## Para desenvolvedores: como contribuir

1. **Leia `CLAUDE.md` primeiro.** Sempre.
2. **Identifique a etapa atual** (seção "Status" do CLAUDE.md).
3. **Crie branch específica** da etapa: `git checkout -b etapa-N-foco`.
4. **Use o prompt da etapa correspondente** em `docs/etapa-N-*.md` no Claude Code.
5. **Após implementar, rode validação** com `docs/validacao-template.md`.
6. **Merge na main apenas depois de validar.**
7. **Atualize o CLAUDE.md** marcando a etapa concluída.

---

## Decisões importantes do projeto

### Por que Supabase em vez de Railway/Cloudflare?
Supabase entrega 3 coisas críticas em um pacote único: Postgres real, Realtime via WebSockets, e Auth gerenciado. Em outras stacks, exigiria 3 serviços + código de integração entre eles.

### Por que cronômetro no servidor?
O cronômetro é controlado por dados no banco (`level_started_at`, `total_paused_ms`), não por `setInterval` no cliente. Isso garante:
- TV pode ser reiniciada e volta sincronizada
- Múltiplas interfaces (TV, admin, jogador) sempre mostram o mesmo tempo
- Resistência a perda momentânea de conexão

### Por que três interfaces?
Cada audiência tem necessidade diferente:
- **TV:** visível pra todos, foco em legibilidade à distância + espetáculo
- **Admin:** denso em informação, foco em ação rápida sob pressão
- **Jogador (V2):** mobile, consulta passiva do próprio status

---

## Roteiro

- [x] Etapa 0 — Setup do projeto
- [ ] Etapa 1 — Fundação (schema, tipos, CRUD evento)
- [ ] Etapa 2 — Cronômetro server-side + TV básica
- [ ] Etapa 3 — Gestão completa de uma partida
- [ ] Etapa 4 — Duas mesas + fila + renovação + rebuy
- [ ] Etapa 5 — Mesa final + pódio
- [ ] Etapa 6 — Polimento (animações, sons, sorteio animado)
- [ ] Etapa 7 — V2 (PWA jogador, WhatsApp, exportação)

---

## Licença

Privada — uso pessoal/eventos entre amigos.

---

*Mantenedor: Samuel Hosken*
