# Etapa 0 — Setup Inicial

> **Esta é a primeira sessão do projeto no Claude Code.** Antes de qualquer linha de código.

---

## Pré-requisitos manuais (você faz antes de chamar a IA)

### 1. Criar repositório no GitHub
- Repo já criado em: `https://github.com/SamuelHosken/poker-pi-app`
- Clone localmente:
  ```bash
  git clone https://github.com/SamuelHosken/poker-pi-app.git
  cd poker-pi-app
  ```

### 2. Criar projeto Supabase
- Acesse https://supabase.com
- Crie projeto novo na região **South America (São Paulo)** se disponível
- **GUARDE** num gerenciador de senhas:
  - Project URL
  - Anon key (publishable)
  - Service role key (secret)
  - Senha do banco

### 3. Instalar CLIs locais
```bash
# Node 20+
node --version

# Supabase CLI
npm install -g supabase

# Verifica
supabase --version
```

### 4. Login e link no Supabase
```bash
supabase login
cd poker-pi-app
supabase init
supabase link --project-ref <seu-project-ref>
```

### 5. Criar `.env.local` (NUNCA commitar)
```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

### 6. Criar `.env.local.example` (commitar)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7. Garantir `.gitignore`
```
node_modules/
.next/
.env.local
.env*.local
.DS_Store
```

---

## Prompt para o Claude Code

> Cole o prompt abaixo no Claude Code, em sessão nova, com o diretório do projeto aberto.

```
Estou começando o projeto Poker Pi do zero. Já tenho:
- Repo Git clonado localmente
- Projeto Supabase criado e linkado via supabase CLI
- .env.local com as credenciais
- Node 20+ e npm

Faça AGORA o setup inicial do projeto. Não escreva código de negócio
ainda — só a fundação estrutural.

## Tarefas

### 1. Inicializar Next.js 14
- Crie projeto Next.js 14 com:
  - App Router
  - TypeScript estrito
  - Tailwind CSS
  - ESLint
  - src/ directory: NÃO (queremos app/ na raiz)
  - import alias: @/* (padrão)

### 2. Configurar TypeScript estrito
Edite tsconfig.json para incluir:
- "strict": true
- "noUncheckedIndexedAccess": true
- "noImplicitOverride": true
- "noImplicitReturns": true
- "noFallthroughCasesInSwitch": true

### 3. Instalar dependências
```bash
npm install @supabase/supabase-js @supabase/ssr zod date-fns lucide-react sonner nanoid
npm install -D @types/node
```

### 4. Setup do shadcn/ui
```bash
npx shadcn@latest init
```
Configurações:
- Style: New York
- Base color: Zinc
- CSS variables: Yes
- Tailwind config customizado: Yes

Adicione estes componentes:
```bash
npx shadcn@latest add button input label card dialog toast sonner table form
```

### 5. Criar o arquivo CLAUDE.md na raiz
Crie /CLAUDE.md exatamente com o conteúdo do template em
docs/_templates/CLAUDE.md (esse arquivo eu já forneci separadamente
e está na pasta docs/_templates).

Se docs/_templates/CLAUDE.md não existir, me avise — vou criar o conteúdo
correto manualmente.

### 6. Estrutura de pastas
Crie a estrutura de pastas conforme listada no CLAUDE.md:

```
app/
├── (admin)/
│   ├── dashboard/
│   ├── events/
│   └── login/
├── (public)/
│   ├── tv/
│   └── player/
components/
├── ui/        ← shadcn já criou
├── admin/
├── tv/
└── player/
lib/
├── supabase/
├── timer/
├── tournament/
└── types/
supabase/
└── migrations/
public/
└── sounds/
docs/         ← já existe se copiou os arquivos da documentação
```

Use .gitkeep nas pastas que vão ficar vazias por enquanto.

### 7. Configurar paleta Poker Pi
Em app/globals.css, sobrescreva as variáveis CSS do shadcn pra refletir
a paleta da marca. Variáveis em :root (light mode opcional) e na classe
.dark (que será nosso default):

```css
.dark {
  --background: 240 5% 4%;      /* #0A0A0B ink */
  --foreground: 40 27% 93%;     /* #F5F1E8 paper */
  --card: 240 7% 8%;            /* #131316 ink-2 */
  --card-foreground: 40 27% 93%;
  --popover: 240 7% 8%;
  --popover-foreground: 40 27% 93%;
  --primary: 41 47% 60%;        /* #C9A961 gold */
  --primary-foreground: 240 5% 4%;
  --secondary: 240 5% 10%;
  --secondary-foreground: 40 27% 93%;
  --muted: 240 5% 10%;
  --muted-foreground: 0 0% 60%;
  --accent: 41 47% 60%;
  --accent-foreground: 240 5% 4%;
  --destructive: 351 84% 42%;   /* #C8102E red */
  --destructive-foreground: 0 0% 100%;
  --border: 240 5% 15%;
  --input: 240 5% 15%;
  --ring: 41 47% 60%;
}

html { color-scheme: dark; }
body { background: hsl(var(--background)); color: hsl(var(--foreground)); }
```

Configure html como <html lang="pt-BR" class="dark"> no app/layout.tsx.

### 8. Importar fontes
No app/layout.tsx, importe via next/font/google:
- Fraunces (display)
- Geist Sans (body)
- Geist Mono (mono)

Configure como CSS variables: --font-display, --font-body, --font-mono.

Atualize tailwind.config.ts pra usar essas variáveis:
```ts
fontFamily: {
  display: ['var(--font-display)', 'serif'],
  sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'monospace'],
}
```

### 9. Cliente Supabase (placeholder)
Crie os 3 arquivos em lib/supabase/ com a estrutura básica conforme
descrita em docs/03-padroes-tecnicos.md, seção 4:
- server.ts
- client.ts
- middleware.ts

Crie também middleware.ts na raiz que invoca o middleware.ts do lib.

### 10. Página inicial (placeholder)
Crie app/page.tsx com uma tela simples mostrando:
- Logo "Poker Pi" em Fraunces grande
- Texto "Sistema de gestão de torneio"
- Link pra /admin/login (que ainda não existe, ok)

### 11. Validação final
Rode estes comandos e me mostre que todos passam:
```bash
npm run build
npm run lint
npx tsc --noEmit
```

Se houver erro, corrija até passar 100%.

### 12. Primeiro commit
Faça commit com a mensagem:
"chore: setup inicial do projeto - estrutura, tipografia, paleta"

NÃO faça push ainda — eu valido localmente primeiro.

## Restrições

- NÃO crie nenhum código de domínio ainda (eventos, jogadores, etc)
- NÃO crie migrations SQL ainda (vem na Etapa 1)
- NÃO implemente nenhuma feature, só a fundação técnica
- NÃO instale libs além das listadas
- NÃO crie pasta src/ — queremos app/ direto na raiz

## Critérios de aceitação

Após concluir, eu devo conseguir:
1. Rodar npm run dev sem erros
2. Acessar localhost:3000 e ver a página inicial estilizada
3. npm run build passa
4. npx tsc --noEmit passa
5. npm run lint passa
6. Ver a estrutura de pastas completa
7. Ver o CLAUDE.md na raiz
8. .env.local funciona, .env.local.example commitado

## Ao final

Atualize o CLAUDE.md marcando Etapa 0 como concluída e atualizando
"ETAPA ATUAL" e "PRÓXIMA ETAPA".

Me mostre:
- Lista de comandos pra eu validar localmente
- Qualquer warning ou ponto de atenção
```

---

## Validação manual depois do prompt

Após o Claude Code terminar, **você** valida:

```bash
# 1. Dev server inicia
npm run dev
# Abre http://localhost:3000 — deve aparecer página estilizada

# 2. Build passa
npm run build

# 3. TypeScript OK
npx tsc --noEmit

# 4. Lint OK
npm run lint

# 5. Estrutura de pastas
tree -L 3 -I 'node_modules|.next'

# 6. Confere .gitignore tem .env.local
cat .gitignore | grep env
```

Se TUDO passou, faça push e siga para a **Etapa 1**.

Se algo falhou, abra nova sessão Claude Code com:
```
Leia CLAUDE.md primeiro. Acabei de tentar a Etapa 0 e [descrever erro].
Vamos consertar antes de avançar.
```

---

*Próximo: `etapa-1-fundacao.md`*
