# 01 — Decisões Fechadas

> Decisões já tomadas. **Não revisitar sem motivo forte.** Se algo precisar mudar, atualize este documento e justifique.

---

## Formato do torneio

| Item | Decisão |
|---|---|
| Número típico de participantes | 30 (mas configurável: 12-40) |
| Mesas físicas | 2 (configurável) |
| Tamanho ideal de mesa | 8 jogadores (configurável) |
| Quantos classificam por mesa | **1 (apenas o vencedor)** |
| Mesa final | Reúne todos os vencedores das classificatórias |

**Por quê 1 vencedor por mesa:** simplifica o sistema, evita lógica de "2º, 3º colocado também avança", reduz complexidade no schema. Se demanda real mostrar que precisa flexibilizar, refazer.

---

## Rebuy

| Item | Decisão |
|---|---|
| Rebuy permitido | Sim, configurável por evento |
| Valor padrão | R$45 (mas qualquer valor) |
| Limite por jogador | Default 1 rebuy (configurável) |
| Janela de tempo | Até o final do nível N (default: nível 3) |
| Quando o rebuy entra | Jogador volta à mesma fila de presentes |

**Por quê configurável:** alguns eventos não terão rebuy, outros terão múltiplos. Sistema precisa flexibilizar.

---

## Buy-in e dinheiro

| Item | Decisão |
|---|---|
| O sistema controla pagamentos? | **Não.** Apenas registra "pagou / não pagou". |
| Dinheiro físico | Fora do escopo (organizador controla manualmente). |
| Premiação | Fora do escopo. Sistema só registra posições finais. |

**Por quê não controlar pagamento:** complexidade enorme, requisitos legais (PCI, etc), valor agregado pequeno pro caso de uso. Evento entre amigos, dinheiro vai de mão em mão.

---

## Estrutura de blinds

| Item | Decisão |
|---|---|
| Templates prontos | **Sim, 3 templates no MVP:** Turbo, Padrão, Lento |
| Customização | Sim, organizador pode editar valores/duração de cada nível |
| Estrutura da mesa final | **Pode ser diferente** das classificatórias (default mais lenta) |

### Templates iniciais

**Turbo** (eventos rápidos, ~2h)
- 10 níveis, 10 min cada
- SB começa em 25, dobra a cada 2-3 níveis

**Padrão** (eventos normais, ~3h)
- 12 níveis, 15 min cada
- SB começa em 25, cresce progressivo

**Lento** (eventos longos, ~4-5h)
- 15 níveis, 20 min cada
- SB começa em 25, cresce mais suave

Valores exatos serão definidos no código (`lib/tournament/blind-templates.ts`).

---

## Sorteio e atribuição de jogadores

| Item | Decisão |
|---|---|
| Atribuição inicial às mesas | Sorteio assistido pelo sistema (com animação na TV) |
| Renovação de mesa | Organizador escolhe (manualmente ou via sorteio) |
| Cadeiras dentro da mesa | Sistema atribui aleatoriamente |

**Sorteio animado é parte do MVP.** É o "uau" do produto.

---

## Cronômetro e blinds

| Item | Decisão |
|---|---|
| Onde roda | **Servidor (Supabase)** — regra inviolável |
| Avanço de nível | Automático quando tempo acaba |
| Pausa | Manual pelo organizador (mesa em estado PAUSADA) |
| Mesa final | Cronômetro independente, estrutura própria |

---

## Reversibilidade

| Item | Decisão |
|---|---|
| Ações reversíveis | Eliminação, finalização de mesa, atribuição de cadeira |
| Como | Tabela `action_log` registra cada ação reversível |
| Janela de reversão | Até a próxima ação importante (sem limite de tempo, mas com confirmação) |
| Confirmação | Modal "Tem certeza? Isso vai desfazer X" |

---

## Autenticação

| Interface | Auth |
|---|---|
| Painel Admin | Supabase Auth (email + senha) |
| TV Pública | **Nenhuma** (URL pública por design) |
| Jogador | Token único na URL (sem cadastro/senha) |

**Por quê TV sem auth:** televisão pode ser configurada por pessoa diferente do organizador (alguém ligando a TV, abrindo URL). Friction de login derrota o propósito.

**Por quê jogador sem cadastro:** evento entre amigos, ninguém quer criar conta. Token gerado no credenciamento é "good enough".

---

## Stack técnica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + Server Components + Server Actions |
| Linguagem | TypeScript estrito | Pega bug em compile-time |
| UI | shadcn/ui + Tailwind | Componentes prontos, customizáveis |
| Banco | Supabase (Postgres) | Postgres real + Realtime + Auth em um pacote |
| Realtime | Supabase Realtime | Subscriptions WebSocket prontas |
| Auth | Supabase Auth | Email/senha simples, gerenciado |
| Deploy | Vercel | Integração perfeita com Next.js |

**Por quê não Cloudflare ou Railway:** discutido em sessão anterior. Supabase entrega 3 coisas críticas em um pacote (banco + realtime + auth) que em outras stacks exigiria 3 serviços + código de cola.

---

## Internacionalização

| Item | Decisão |
|---|---|
| UI em português brasileiro | Sim, toda |
| i18n (múltiplos idiomas) | **Não no MVP.** Pode ser V2. |
| Código em inglês | Sim (variáveis, tipos, funções) |

---

## Audio (sons)

| Evento | Som |
|---|---|
| Eliminação | Som curto, sutil |
| Finalização de mesa | Som de vitória, mais longo |
| Renovação (chamada) | Som de chamada (apito ou similar) |
| Nível subiu | Notificação sutil |

**Local dos arquivos:** `public/sounds/*.mp3`.
**Trigger:** apenas na TV pública (não nos outros clientes).

---

## V2 (depois do MVP completo)

Coisas que **explicitamente NÃO vão no MVP**:

- [ ] PWA do jogador (interface no celular)
- [ ] Integração WhatsApp (notificações de chamada)
- [ ] Exportação PDF de resultados
- [ ] Histórico visual de eventos passados (banco já guarda, mas UI fica pra depois)
- [ ] Estimativa de horário de encerramento
- [ ] Modo offline da TV
- [ ] Dashboard de estatísticas multi-evento
- [ ] Templates de evento (salvar config pra reutilizar)
- [ ] Stack dos jogadores na TV (decidido NÃO fazer, vira info enganosa)

---

## O que ainda está EM ABERTO (decisões adiadas)

Estas decisões podem ser tomadas em etapas mais avançadas:

1. **Comportamento exato quando fila esgota e número ímpar de jogadores resta.** Documento original menciona, mas vamos ver na prática como modelar.

2. **Como modelar visualmente o estado "CHAMADO" na TV.** É anúncio temporário ou estado persistente? Provavelmente animação temporária + lista visível por X segundos.

3. **Exato fluxo de rebuy.** Jogador eliminado → volta à fila com flag `was_rebuy`? Ou volta à mesa de onde saiu? **A definir na Etapa 4.**

4. **Como integrar webhooks do Supabase Auth pra criar perfil de admin automaticamente.** Decisão técnica que cabe na Etapa 1.

---

## V1.1 — Decisões (2026-05-21)

Iteração de simplificação aplicada após MVP feature-complete. Decisões abaixo são **definitivas para V1.1** e não devem ser revisitadas sem motivo forte. Documento completo: `docs/iteracao-v1-1-simplificacao.md`.

| Item | Decisão V1.1 |
|---|---|
| Mesas | **Contínuas** — não renovam, não terminam. Mesa joga até evento acabar |
| Quando mesa esvazia | Fica em JOGANDO com 0 participações ativas. Não muda estado |
| Cronômetro | Pode ficar **negativo** após zerar (sem clamp em 0). Cor vermelha quando expirado |
| Avanço de nível | **Manual** — admin clica "Avançar nível". Sem cron automático |
| Vencedor | Detectado **automaticamente** quando sobra 1 jogador em JOGANDO no evento todo. Vira CAMPEAO + event → ENCERRADO |
| Fallback | Botão "Encerrar evento manualmente" no rodapé. Se 1 player em JOGANDO, coroa; senão encerra sem campeão |
| Mesa final | **Removida** como fase. Não há mais transição EM_ANDAMENTO → MESA_FINAL |
| Estados de Player simplificados | INSCRITO, PRESENTE, JOGANDO, ELIMINADO, CAMPEAO (resto deprecated) |
| Estados de Event simplificados | SETUP, CREDENCIAMENTO, EM_ANDAMENTO, ENCERRADO (MESA_FINAL deprecated) |
| Pódio | Identifica I/II/III por `final_position` puro (1=campeão, 2=penúltimo eliminado, etc.) |
| Fila de espera | Não é mais conceito visual separado. Dialog "Iniciar partida" mostra todos PRESENTE direto |
| Compat com dados antigos | Tudo preservado. Eventos antigos com MESA_FINAL/CLASSIFICADO/VICE/TERCEIRO continuam renderizando |

---

*Próximo passo: ler `02-modelo-de-dados.md` para entender a estrutura do banco.*
