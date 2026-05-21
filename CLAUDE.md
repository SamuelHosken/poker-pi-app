# Poker Pi — Sistema de Gestão de Torneio de Poker

> **Este arquivo é a memória persistente do projeto. Leia-o no início de TODA sessão.**

---

## 1. Sobre o produto

Sistema web para gerenciar torneios presenciais de poker entre amigos. **Não é** casa de poker online — é uma ferramenta de apoio logístico a um evento físico, real, com cartas e fichas reais.

**Evento típico:** 30 participantes, 2 mesas físicas de 8 jogadores cada. Vencedor de cada mesa classifica para a mesa final. Mesa final define o campeão da noite. Suporta rebuy limitado por jogador.

**Contexto de uso:** festa entre amigos, com bar, música, distração. Organizador opera o sistema sob pressão social. UI precisa ser óbvia e tolerante a erros.

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Linguagem | TypeScript estrito |
| UI | Tailwind CSS + shadcn/ui |
| Banco | Supabase (Postgres gerenciado) |
| Real-time | Supabase Realtime |
| Auth | Supabase Auth |
| Hospedagem | Vercel |
| Versionamento | Git + GitHub |

---

## 3. As três interfaces

| Interface | Rota | Quem usa | Auth |
|---|---|---|---|
| Painel Admin | `/admin/*` | Organizador (laptop/tablet) | Email + senha |
| TV Pública | `/tv/[eventId]` | Todos no salão (televisão) | Nenhuma (URL pública) |
| Jogador | `/player/[token]` | Participante (celular) | Token único na URL |

---

## 4. Princípios INVIOLÁVEIS

Estes não são preferências, são **regras absolutas**:

1. **Cronômetro no servidor.** NUNCA usar `setInterval` no cliente pra cronômetro. O servidor guarda timestamp de início do nível, duração, tempo pausado. O cliente CALCULA o display a partir disso.

2. **Real-time via Supabase Realtime.** Toda mudança de estado dispara subscription que atualiza as 3 interfaces simultaneamente. Nunca polling.

3. **Reversibilidade.** Toda ação importante (eliminação, finalização de mesa, etc) DEVE ter botão de desfazer. Manter `action_log`.

4. **Resiliência.** Se internet cair, sistema não pode quebrar catastroficamente. Estados precisam ser recuperáveis ao reconectar.

5. **Server-authoritative.** Decisões de estado acontecem no servidor (via RLS + Server Actions). Cliente apenas reflete.

6. **Confirmação para ações destrutivas.** Finalizar mesa, encerrar evento, apagar jogador — sempre com modal de confirmação.

7. **Português brasileiro em TODA UI.** Labels, mensagens, erros. Código em inglês.

---

## 5. Entidades centrais

```
Event (evento da noite)
 ├── BlindLevels (estrutura de blinds, com flag is_final_table)
 ├── PhysicalTables (Mesa 1, Mesa 2 — permanentes durante evento)
 ├── Players (participantes)
 │    └── estado: INSCRITO → PRESENTE → CHAMADO → JOGANDO →
 │              (ELIMINADO | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/3º/...)
 └── Matches (cada partida em uma mesa física)
      └── Participations (jogador em uma partida específica)

ActionLog (log para reversibilidade)
```

---

## 6. Máquinas de estado

### Event
```
SETUP → CREDENCIAMENTO → EM_ANDAMENTO → MESA_FINAL → ENCERRADO
```

### Match (uma partida)
```
LIVRE → JOGANDO ⇄ PAUSADA → FINALIZADA
```

### Player
```
INSCRITO → PRESENTE → CHAMADO → JOGANDO →
  (ELIMINADO | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/TERCEIRO/...)
```

---

## 7. Convenções de código

- **TypeScript estrito.** ZERO `any`. Tipos derivados do schema Supabase via `supabase gen types typescript`.
- **Server Components por padrão.** Use `'use client'` só quando precisar (estado local, eventos do navegador).
- **Server Actions** para mutações. Não criar rotas API à toa.
- **Nomes em inglês no código**, **português na UI**.
- **Componentes < 200 linhas.** Se passar, quebrar.
- **Lógica de domínio em `lib/`**, não dentro de componentes.

---

## 8. O que NUNCA fazer

- Cronômetro com `setInterval` no cliente
- `any` em TypeScript
- Lógica de negócio dentro de componentes React
- Polling de banco quando dá pra usar Realtime
- Hardcoded de configurações que deveriam estar no banco
- Mudar estado no cliente sem persistir no banco antes
- UI sem confirmação para ações destrutivas
- Botões pequenos no painel admin (vai ser usado sob pressão)
- **Commitar credenciais** (`.env.local` está no `.gitignore` desde sempre)

---

## 9. Estrutura de pastas

```
poker-pi-app/
├── CLAUDE.md                    ← você está aqui
├── README.md                    ← onboarding técnico
├── docs/                        ← cadeia de informações
│   ├── 00-visao-geral.md
│   ├── 01-decisoes-fechadas.md
│   ├── 02-modelo-de-dados.md
│   ├── 03-padroes-tecnicos.md
│   ├── etapa-1-fundacao.md
│   ├── etapa-2-cronometro-tv.md
│   ├── etapa-3-admin-partida.md
│   ├── etapa-4-duas-mesas.md
│   ├── etapa-5-mesa-final.md
│   ├── etapa-6-polimento.md
│   ├── etapa-7-v2.md
│   └── validacao-template.md
├── app/
│   ├── (admin)/
│   ├── (public)/
│   └── api/
├── components/
│   ├── ui/                      ← shadcn
│   ├── admin/
│   ├── tv/
│   └── player/
├── utils/
│   └── supabase/             ← cliente Supabase (convenção do wizard atual)
├── lib/
│   ├── utils.ts              ← cn() do shadcn
│   ├── timer/
│   ├── tournament/
│   └── types/
├── supabase/
│   └── migrations/
└── public/
    └── sounds/
```

---

## 10. Status atual do projeto

**ETAPA ATUAL:** 6 + 7-A (concluídas — código; aguardando validação E2E)
**PRÓXIMA ETAPA:** validar end-to-end e merge na main

### Roteiro de etapas

- [x] Etapa 0: Setup do projeto, CLAUDE.md, estrutura de pastas → `docs/etapa-0-setup.md`
- [x] Etapa 1: Fundação (schema, tipos, CRUD evento) → `docs/etapa-1-fundacao.md`
- [x] Etapa 2: Cronômetro server-side + TV básica → `docs/etapa-2-cronometro-tv.md`
- [x] Etapa 3: Painel admin de uma partida → `docs/etapa-3-admin-partida.md`
- [x] Etapa 4: Duas mesas + fila + renovação → `docs/etapa-4-duas-mesas.md`
- [x] Etapa 5: Mesa final + pódio → `docs/etapa-5-mesa-final.md`
- [x] Etapa 6: Polimento (animações, sons, sorteio) → `docs/etapa-6-polimento.md`
- [~] Etapa 7-A: PWA do jogador + QR codes → `docs/etapa-7-v2.md`
- [ ] Etapa 7-B: WhatsApp (Twilio) — post-MVP, requer creds
- [ ] Etapa 7-C: Export PDF — opcional, JSON já cobre exporta

---

## 11. Como navegar nesta documentação

Quando estiver começando uma sessão, faça nesta ordem:

1. **Leia este arquivo (CLAUDE.md)** primeiro
2. **Veja em qual etapa estamos** (seção "Status atual" acima)
3. **Abra o arquivo da etapa correspondente** em `docs/etapa-N-*.md`
4. **Se for a primeira sessão do dia**, leia também `docs/00-visao-geral.md` e `docs/01-decisoes-fechadas.md` pra refrescar
5. **Execute o que está na etapa**
6. **Antes de avançar de etapa**, rode a validação correspondente
7. **Atualize o status no final deste arquivo** ao concluir uma etapa

---

## 12. Decisões fechadas (resumo)

Para detalhes, ver `docs/01-decisoes-fechadas.md`.

| Decisão | Valor |
|---|---|
| Formato torneio | 30 jogadores, 2 mesas de 8, 1 vencedor classifica |
| Mesa final | Reúne vencedores das classificatórias |
| Rebuy | Configurável por evento (default: 1 rebuy até nível 3) |
| Sorteio animado | Incluído no MVP |
| Estrutura de blinds | Templates prontos + custom |
| PWA jogador | V2 |
| WhatsApp | V2 |

---

## 13. Convenções pra trabalhar com o Claude Code

- **Use branch por etapa.** Crie `etapa-N-nome` e merge na main ao validar.
- **Commit frequente.** Mesmo coisas pequenas. Salva você de "rollback grande".
- **Não pule validação.** Cada etapa tem prompt de validação. Use.
- **Se travar, nova sessão.** Claude Code se confunde em sessões muito longas. O CLAUDE.md existe pra isso — nova sessão lê o arquivo e continua.
- **Quando atualizar o CLAUDE.md**, marque o checkbox da etapa e atualize as linhas "ETAPA ATUAL" e "PRÓXIMA ETAPA".

---

*Fim do CLAUDE.md.*
