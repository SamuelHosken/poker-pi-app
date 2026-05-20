# Template — Prompt de Validação de Etapa

> Use este template **ao final de cada etapa**, antes de mergear na main. Cole no Claude Code com substituições conforme a etapa.

---

## Como usar

1. Substitua `[N]` pelo número da etapa
2. Substitua `[FOCO_DA_ETAPA]` por uma frase curta do que foi entregue
3. Cole no Claude Code em sessão **separada** (não a mesma que implementou)
4. Faça as perguntas extras se a etapa teve particularidades

---

## Prompt base

```
Leia CLAUDE.md primeiro. Acabei de concluir a Etapa [N]: [FOCO_DA_ETAPA].

Vamos AUDITAR o que foi feito antes de mergear na main. Responda cada
item com trecho de código relevante e diga "OK" ou "PROBLEMA: [...]"
em cada um.

## Checklist universal de qualidade

### Code quality
1. Há algum uso de `any` em código TypeScript novo? Liste todos.
2. Há algum `console.log` esquecido? Liste e remova se houver.
3. Algum `// TODO` que ficou pra trás? Liste.
4. Há código duplicado (>5 linhas) entre arquivos novos? Liste.

### TypeScript
5. `npx tsc --noEmit` passa 100%? Mostre output.
6. Tipos são derivados do schema Supabase (database.types.ts) ou
   inventados à mão? Mostre exemplos.

### Padrões do projeto
7. Server Components vs Client Components estão usados corretamente?
   Identifique algum `'use client'` desnecessário.
8. Server Actions têm validação Zod? Liste actions criadas e verifique.
9. Todas as ações destrutivas têm confirmação (AlertDialog)? Liste.
10. Há lógica de negócio (fetch, mutation) dentro de componentes em
    `components/`? Não deveria haver.

### Supabase / Banco
11. Migrations rodaram sem erro? Há diff pendente em `supabase db diff`?
12. RLS está habilitada em todas as tabelas novas/modificadas?
13. Policies de SELECT/INSERT/UPDATE/DELETE estão configuradas?
14. Há índices em FKs e colunas usadas em WHERE frequente?

### Real-time
15. Toda subscription tem cleanup no useEffect return?
16. Subscriptions usam `filter:` no postgres_changes pra reduzir tráfego?
17. Initial data vem do Server Component (evita flash)?

### Reversibilidade
18. Todas as ações importantes desta etapa logam no action_log?
19. undoLastAction sabe lidar com cada novo tipo de ação?

### Estado e transições
20. Mudanças de estado (event, match, player) passam por função de
    validação? Algum UPDATE direto que deveria validar?

### i18n e UX
21. Toda mensagem na UI é em português?
22. Valores monetários formatados como "R$ X,XX"?
23. Datas formatadas em pt-BR?

### Performance
24. revalidatePath é chamado em todas as mutations?
25. Server Actions não fazem queries N+1?

### Segurança
26. Service Role Key é usada apenas em código server-side?
27. Credenciais nunca em arquivos commitados?

## Pergunta específica desta etapa

[PERGUNTAS_ESPECIFICAS_DA_ETAPA]

## Resumo final

No final, dê um veredicto:
- ✅ APROVADO — posso mergear
- ⚠️ APROVADO COM RESSALVAS — itens X, Y, Z pra resolver depois
- ❌ REPROVADO — itens críticos: [lista]

E me sugira uma lista priorizada de correções se houver.
```

---

## Perguntas específicas por etapa

### Etapa 1 — Fundação
- A modelagem permite múltiplas matches na mesma physical_table?
- Templates de blinds (Turbo/Padrão/Lento) têm valores realistas?

### Etapa 2 — Cronômetro
- O cronômetro tem `setInterval` controlando o tempo (proibido) ou só re-renderizando?
- Avanço automático de nível é via cron, edge function, ou outro mecanismo?
- Se internet cair na TV, reconecta automaticamente?

### Etapa 3 — Admin de partida
- undoLastAction cobre os 4 tipos de ação?
- Audio respeita autoplay policies?
- final_position é calculado corretamente?

### Etapa 4 — Duas mesas
- Subscriptions de cada mesa são independentes (filter por match_id)?
- Rebuy valida elegibilidade corretamente (level, limit, state)?
- Renovação cria match nova sem afetar a outra mesa?

### Etapa 5 — Mesa final
- transitionToFinalTable trata caso de < 2 classificados?
- Estrutura de blinds is_final_table=true é usada corretamente?
- Posições finais (1º, 2º, 3º, ...) são atribuídas certinhas?

### Etapa 6 — Polimento
- Animações mantêm 60fps?
- Sorteio animado tem timing certo (8-12s)?
- Sons funcionam após "ATIVAR SOM"?

### Etapa 7 — V2
- PWA tem manifest válido?
- Twilio integration trata casos de erro (telefone inválido, etc)?

---

*Use sempre. Não pule.*
