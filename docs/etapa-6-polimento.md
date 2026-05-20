# Etapa 6 — Polimento (Animações, Sons, Sorteio Animado)

> Aqui o produto vira espetáculo. Sem isso o sistema funciona — mas com isso ele vira o "uau" da festa.

---

## Pré-requisitos

- ✅ Etapa 5 concluída e validada

---

## Branch

```bash
git checkout main && git pull
git checkout -b etapa-6-polimento
```

---

## Prompt para o Claude Code

```
Leia CLAUDE.md e todos os docs. Esta é a Etapa 6 — polimento visual e sonoro.

ETAPA 6: Animações + sons + sorteio animado + design Poker Pi.

## Objetivo

Transformar o sistema funcional num produto de qualidade premium. A TV
precisa virar atração. O painel admin precisa ficar agradável de usar.

## Tarefas

### 1. Design refinado da TV
Aplique a identidade visual Poker Pi (paleta dark + dourado + Fraunces) em:

- Header com logo Poker Pi (a moeda π)
- Estado do evento em badge elegante
- Cronômetros em fonte mono GIGANTE (~150px)
- Blinds em Fraunces destacada
- Cards das mesas com glow dourado sutil quando JOGANDO
- Transições suaves entre estados (fade/scale, não cuts duros)

Use motion (framer-motion) pra animações declarativas.

```bash
npm install framer-motion
```

### 2. Animação de eliminação refinada
Em vez do toast simples da Etapa 3:

- Overlay escuro lateral
- Foto/avatar do jogador (se não tiver, círculo com inicial)
- Nome em Fraunces grande
- "ELIMINADO — POSIÇÃO N"
- Animação: slide from right + fade
- Duração 4s, com easing suave
- Som: sussurro grave + impacto sutil

### 3. Animação de finalização de mesa
- Full screen overlay dourado degrade
- Nome do vencedor em fonte massiva
- "VENCEDOR — MESA X"
- Confetes douradas (canvas-confetti)
- Som de vitória completo (5-8s)
- Após, fade out elegante voltando ao normal

```bash
npm install canvas-confetti
```

### 4. SORTEIO ANIMADO — o ovo de Colombo do produto
Quando organizador clica "Iniciar partida" ou "Renovar mesa", em vez
de modal seco, abre tela cheia na TV (e modal pro admin) com:

components/tv/draw-animation.tsx:

1. Tela cheia preta com π central girando
2. Texto: "SORTEANDO MESA X"
3. Lista de nomes da fila começa a "rolar" rapidamente (estilo bingo):
   - Cada nome aparece e some em 100ms
   - Aceleração gradual de 200ms → 50ms
   - Desaceleração de 50ms → 500ms
4. Quando para, fixa um nome com glow dourado e som de "ding"
5. Move pra próximo seat, repete pra cada um dos 8 jogadores
6. Ao final, lista completa aparece com:
   "Mesa X — Jogadores chamados:
    Cadeira 1: João
    Cadeira 2: Maria
    ..."
7. Som de fanfarra
8. 2s depois, TV volta ao layout normal

Implementação:
- Use framer-motion pras animações
- Use Web Audio API ou <audio> tags pros sons
- Estado controlado por uma flag no admin que dispara o sorteio

### 5. Animações no painel admin
Mais sutis (admin não pode ser distraído):

- Hover states com transição suave (200ms)
- Toast notifications no canto pra confirmações de ação
- Loading spinner durante Server Actions
- Skeleton loading ao trocar de página

### 6. Sons reais
Substitua os placeholders por sons reais (Freesound.org, com créditos):

- public/sounds/elimination.mp3 — som de eliminação (impacto curto)
- public/sounds/match-finish.mp3 — som de vitória (fanfarra)
- public/sounds/calling.mp3 — som de chamada (sino ou apito)
- public/sounds/draw-tick.mp3 — som do sorteio rolando
- public/sounds/draw-stop.mp3 — som de "ding" quando para
- public/sounds/champion.mp3 — som de campeão (fanfarra grande)
- public/sounds/level-up.mp3 — quando blind sobe

Componentize:
```ts
// lib/audio/play-sound.ts
export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return;
  const audio = new Audio(`/sounds/${name}.mp3`);
  audio.volume = 0.7;
  audio.play().catch(() => {}); // ignora autoplay block
}
```

### 7. Botão "Ativar som" na TV
Por autoplay policies, o navegador bloqueia áudio até o usuário interagir
pelo menos uma vez. Adicione na TV um botão grande "🔊 ATIVAR SOM" no
primeiro acesso. Depois disso, sons funcionam.

Persiste no localStorage que o som está ativado.

### 8. Logo Poker Pi
Importe a logo (moeda π dourada) e use em:
- Header da TV (canto, pequeno)
- Loading screen
- Pódio final (como elemento decorativo)

### 9. Loading states e error boundaries
- Adicione loading.tsx pra cada rota
- Adicione error.tsx com mensagem em português + botão "Tentar novamente"

### 10. Polimento de tipografia
Revise todos os textos da UI:
- Português correto (sem "aceitar mudanças" não-naturais)
- Sentence case consistente
- Datas formatadas em pt-BR (date-fns/locale/pt-BR)
- Valores monetários: R$ 25,00 (não $25 ou R$25)

### 11. Mobile responsive do painel admin
Painel admin deve funcionar OK em tablet (768-1024px). Não precisa
ser perfeito em celular (organizador usa tablet/laptop).

### 12. Commit
git commit -m "feat(etapa-6): polimento, animações, sorteio animado, sons"

## Restrições

- Animações NÃO podem comprometer performance (manter 60fps)
- Sons respeitam controle de volume do usuário (botão mute)
- Polimento visual NÃO pode quebrar nenhuma funcionalidade existente

## Critérios de aceitação

1. Build/lint/tsc passam, zero any
2. TV agora parece um produto premium, não um protótipo
3. Sorteio animado funciona — leva uns 8-12s, tem ritmo, hipnotiza
4. Eliminação tem animação refinada + som
5. Finalização explode visualmente
6. Pódio final é cinematográfico
7. Painel admin tem feedback visual em cada ação
8. Sons funcionam após clique no "ATIVAR SOM"
9. Lighthouse score da TV ≥ 90 em Performance

## Ao final
Atualize CLAUDE.md.
```

---

## Validação

Foco em:
- [ ] 60fps em animações (DevTools Performance tab)
- [ ] Sons tocam corretamente
- [ ] Sorteio animado tem timing certo (não muito rápido, não chato)
- [ ] Identidade visual Poker Pi consistente
- [ ] Mobile/tablet do admin não quebra

---

*Próximo: `etapa-7-v2.md`*
