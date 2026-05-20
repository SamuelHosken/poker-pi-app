# Etapa 7 — V2: PWA do Jogador + WhatsApp

> Features secundárias do documento original. **MVP completo está em Etapa 6.** Esta etapa é "V2" — feita depois do primeiro evento real usando o sistema.

---

## Por que esta etapa é separada

O documento original já marca essas como "secundárias". A recomendação é:
1. Roda o sistema com Etapas 0-6 num evento real
2. Veja o que doeu, o que funcionou
3. SÓ DEPOIS implemente esta etapa, com aprendizados reais

Não implemente isso especulativamente.

---

## Pré-requisitos

- ✅ Etapas 0-6 concluídas
- ✅ **Sistema rodou em pelo menos 1 evento real**
- ✅ Você tem feedback dos usuários

---

## Branch

```bash
git checkout main && git pull
git checkout -b etapa-7-v2
```

---

## Prompt para o Claude Code

```
Leia CLAUDE.md e todos os docs. Esta é a Etapa 7 — V2.

ETAPA 7: PWA do jogador + integração WhatsApp.

## Sub-etapa A: PWA do jogador

### 1. Manifest e ícones
- public/manifest.json com nome, ícones, theme color (gold)
- Ícones em vários tamanhos (192x192, 512x512)
- Configure metadata no app/layout.tsx

### 2. Página /player/[token]
app/(public)/player/[token]/page.tsx (Server Component):

Layout minimalista mobile-first:
- Header: logo Poker Pi pequeno, nome do jogador grande
- Estado visual (badge colorido grande):
  - PRESENTE → "Você está na fila"
  - JOGANDO → "Você está jogando — Mesa X"
  - ELIMINADO → "Eliminado — Posição X"
  - CLASSIFICADO → "🏆 Classificado pra Mesa Final"
  - CAMPEAO → "🏆🏆🏆 CAMPEÃO 🏆🏆🏆"
- Informações contextuais:
  - Se PRESENTE: "X pessoas na sua frente · estimativa Y min"
  - Se JOGANDO: cronômetro + blinds (versão reduzida da TV)
  - Se ELIMINADO: "Acompanhe o evento na TV"
- Real-time via subscription em players where id = player.id

### 3. Como o jogador acessa
QR code gerado por jogador no painel admin:
- /admin/events/[id]/players → cada player tem botão "QR Code"
- Modal com QR code gerado pra URL /player/[token]
- Imprimir QR codes pra distribuir no credenciamento

```bash
npm install qrcode.react
```

### 4. Add to home screen
PWA permite adicionar à tela inicial. Banner sutil no primeiro acesso
"Adicione à tela inicial pra acesso rápido".

## Sub-etapa B: Integração WhatsApp

Esta sub-etapa requer Twilio ou API equivalente. Avalie ROI antes.

### 5. Configuração Twilio
- Crie conta Twilio
- Configure número do WhatsApp Business
- Adicione env vars:
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_WHATSAPP_FROM

### 6. Server Action: sendWhatsAppNotification
```ts
export async function sendCallNotification(playerId: string, matchInfo: {...}) {
  // 1. Busca player.phone
  // 2. Se null, retorna (skip)
  // 3. Envia mensagem via Twilio:
  //    "🎲 [Nome], você foi chamado para a Mesa X!
  //     Por favor, dirija-se à mesa agora.
  //     Acompanhe: <URL /player/[token]>"
}
```

### 7. Trigger
Quando startNewMatchOnTable é chamado, dispara sendCallNotification
pra cada jogador chamado.

Em paralelo, mantém anúncio sonoro na TV (não substitui).

### 8. Custos
WhatsApp Business via Twilio cobra por mensagem (~R$0,15 cada).
Pra evento de 30 pessoas com várias chamadas: ~R$10/evento. Aceitável.

Documentar custos no README.

## Sub-etapa C: Exportação de resultados (PDF)

### 9. Export PDF
Use react-pdf ou similar pra gerar PDF da classificação final.

```bash
npm install @react-pdf/renderer
```

Botão em /admin/events/[id]/results → gera PDF com:
- Header com logo Poker Pi
- Nome do evento, data
- Classificação completa
- Estatísticas (total de jogadores, tempo total, etc)

### 10. Commit
git commit -m "feat(etapa-7-v2): PWA jogador + WhatsApp + export PDF"

## Restrições

- WhatsApp é caro — só implementar se aprovado
- PWA deve degradar graciosamente em browsers sem suporte

## Critérios de aceitação

1. Jogador acessa via QR code, vê estado próprio
2. "Add to home screen" funciona no iOS e Android
3. Estado atualiza em tempo real conforme evento avança
4. (Se WhatsApp implementado) Notificação chega no celular do jogador
5. PDF exportado tem layout limpo e completo

## Ao final
Atualize CLAUDE.md. Marque projeto como completo.
```

---

## Considerações finais V2

O documento original lista mais coisas como secundárias que NÃO entram nem nesta etapa:

- ❌ **Stack dos jogadores na TV** — explicitamente descartado (vira info enganosa)
- ❌ **Templates de evento** — economiza pouco tempo, complexidade alta
- ❌ **Modo offline da TV** — complexidade alta, raramente útil
- ❌ **Estimativa de horário de encerramento** — Heurística difícil, info pouco usada
- ❌ **Histórico visual multi-evento** — banco já guarda, mas UI raramente necessária

Implemente apenas se DEMANDA REAL aparecer.

---

## Quando considerar o projeto "completo"

Após Etapa 6 + (opcionalmente) partes da Etapa 7, o projeto está pronto.
Manutenção dali pra frente vira reativa:
- Correção de bugs
- Pequenos ajustes de UX baseados em uso real
- Eventualmente, V3 com mudança maior se necessário

**Pare quando o produto ficar bom o suficiente.** Não persiga perfeição.

---

*Fim do roteiro de etapas.*
