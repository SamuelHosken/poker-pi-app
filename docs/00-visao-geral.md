# 00 — Visão Geral do Produto

> Documento conceitual. Leia antes de começar qualquer etapa nova ou ao retomar o projeto após um tempo afastado.

---

## O problema

Sem um software de apoio, o organizador de um torneio de poker presencial precisa controlar simultaneamente:
- Cronômetro de cada mesa
- Estrutura de blinds (subindo a cada N minutos)
- Lista de quem já jogou
- Quem está na fila
- Quem venceu cada mesa (classificados)
- Comunicação verbal para 30 pessoas espalhadas pelo salão

Isso é insustentável. Resulta em atrasos, confusão, brigas sobre regras, e perda do momento de festa.

## A solução

Um sistema web com **três interfaces** sincronizadas em tempo real:

1. **Televisão central** — visível pra todos, mostra estado das mesas, cronômetros, classificados. Cria atmosfera de torneio profissional.
2. **Painel admin** — usado pelo organizador. Controla TUDO: marca eliminações, finaliza mesas, chama jogadores, gerencia fila.
3. **App do jogador (V2)** — celular do participante. Consulta passiva do próprio status (estou na fila? jogando? eliminado?).

## O que o software NÃO é

- ❌ Não distribui cartas (é jogo físico com cartas e dealer humano)
- ❌ Não calcula mão vencedora (dealer humano decide)
- ❌ Não é casa de poker online
- ❌ Não é app de apostas
- ❌ Não substitui o organizador (apoia, mas decisões humanas continuam humanas)

## Princípios de projeto (orientam todas as decisões)

### Simplicidade operacional
Sistema usado 1-2 vezes por mês, por pessoa não-técnica, em ambiente com cerveja e música. UI precisa ser óbvia ao ponto de não exigir manual.

### Resiliência humana
Se internet cair, o evento não para. Sempre existe plano B humano (cronômetro de celular, anotação em papel) ao qual o organizador pode recorrer.

### Transparência total
Tudo que o software sabe deve estar visível em algum lugar. TV mostra estado público pra todos. Painel admin mostra estado completo pra operador. Jogador vê o que diz respeito a ele.

### Reversibilidade
Toda ação importante pode ser desfeita. Erros acontecem em ambiente festivo. O sistema é tolerante.

### Foco no espetáculo
A TV não é apenas funcional, é parte da experiência. Quando uma mesa acaba, momento de celebração visual e sonora. Isso é tão importante quanto a precisão dos dados.

---

## Glossário (vocabulário comum)

| Termo | Significado |
|---|---|
| **Evento** | A noite inteira de poker. Tem data, lista de participantes, estrutura de blinds, termina com campeão. |
| **Mesa Física** | Uma das duas mesas reais (Mesa 1, Mesa 2). Permanente durante o evento. |
| **Partida (Match)** | Uma instância de jogo numa mesa física, do início ao vencedor. A mesma mesa física hospeda várias partidas ao longo da noite. |
| **Buy-in** | Valor pago pra participar (no evento referência, R$25). |
| **Rebuy** | Recompra: jogador eliminado paga de novo pra voltar. Limitado (default 1 por jogador, até nível 3). |
| **Estrutura de blinds** | Tabela que define como apostas obrigatórias crescem. Cada nível tem duração e valores de SB/BB. |
| **Fila de espera** | Conjunto de jogadores presentes que ainda não jogaram. |
| **Classificado** | Vencedor de uma partida classificatória. Vai pra mesa final. |
| **Eliminado** | Perdeu fichas e está fora do torneio. |
| **Mesa Final** | Partida de encerramento, reúne todos os classificados. Define o campeão. |

---

## Atores do sistema

### Organizador / Administrador
Pessoa central do evento. Configura, credencia, controla partidas, registra eliminações, conduz mesa final. **Operador exclusivo do painel admin.** Idealmente, não está jogando.

### Dealer
Opera o jogo físico (embaralha, distribui, calcula apostas). **Não usa o software diretamente.** Comunica eliminações verbalmente para o organizador, que registra no sistema.

### Jogador
Participante. Pode estar jogando, esperando, ou eliminado. Interage com o sistema apenas passivamente, no próprio celular (V2).

### Televisão
Não é uma pessoa, mas é tratada como ator porque tem interface própria. Exibe estado público continuamente. Sem interação humana direta.

---

## Fluxo geral de uma noite

```
1. SETUP (antes do evento)
   Organizador configura blinds, mesas, lista inicial.

2. CREDENCIAMENTO (chegada dos convidados)
   Convidados chegam → marca PRESENTE, registra pagamento.

3. INÍCIO DAS PRIMEIRAS PARTIDAS
   Quando há ≥16 presentes → escolhe 16 → divide entre Mesa 1 e Mesa 2.
   TV anuncia. Partidas começam.

4. PARTIDAS EM ANDAMENTO
   Cronômetro avança. Blinds sobem automaticamente.
   Organizador marca eliminações.
   Pode pausar (intervalo, dúvida de regra).

5. MESA FINALIZA → RENOVAÇÃO
   Vencedor → classificado para mesa final.
   Se ainda há fila: escolhe próximos 8 → nova partida na mesma mesa física.
   Se fila acabou: mesa fica LIVRE.

6. TODAS AS CLASSIFICATÓRIAS TERMINARAM
   Sistema monta mesa final com os classificados.
   Layout da TV muda pra modo cinematográfico.

7. MESA FINAL
   Mesma dinâmica de partida, mas única.
   Eliminações definem posições finais (vice, 3º, etc).
   Último restante = CAMPEÃO.

8. ENCERRAMENTO
   TV mostra pódio e classificação geral.
   Exporta resultados.
```

---

## O que diferencia esse produto de "um cronômetro online qualquer"

1. **Sincronização em tempo real entre 3 interfaces.** Cronômetro server-authoritative.
2. **Modelo de estados completo.** Cada entidade (evento, mesa, jogador) tem máquina de estado validada.
3. **Reversibilidade nativa.** Action log permite desfazer qualquer ação importante.
4. **TV como espetáculo.** Não é só mostrar dados, é criar atmosfera (sons, animações, sorteio, celebrações).
5. **Tolerância a erro humano.** Operador pode errar, sistema acomoda.

---

## Anti-padrões a evitar

- **"Vamos fazer rápido e refatoramos depois"** — não. A fundação (Etapa 1) é crítica. Schema do banco errado = retrabalho infinito.
- **"Vamos usar polling, é mais simples"** — não. Polling em produto multi-tela com atualização constante vira pesadelo. Realtime do Supabase é uma linha de código.
- **"O cronômetro pode ficar no cliente"** — não. Já discutimos. Cronômetro no servidor é regra inviolável.
- **"Vamos pular a confirmação, deixa só o botão"** — não. Em ambiente de festa, gente clica errado. Confirmação é obrigatória.
- **"Mobile-first não importa, é só pra desktop"** — sim importa. Jogador (V2) é mobile-only. Painel admin pode ser tablet. Só a TV é fixa em tela grande.

---

*Próximo passo: ler `01-decisoes-fechadas.md` para ver as decisões já tomadas.*
