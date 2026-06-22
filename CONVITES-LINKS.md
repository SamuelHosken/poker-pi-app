# 🎟️ Links dos convites personalizados — PokerPi (nova edição)

Cada pessoa tem um link próprio. Ao abrir e tocar em **"Assistir o convite"**, o
vídeo já começa falando o nome dela. A página é a mesma de `/inscrever` (hero +
formulário) — só o vídeo muda.

> **Domínio:** `https://poker-pi-app.vercel.app`
> Se você usar um domínio próprio, é só trocar a parte do domínio nos links.

> ⚠️ Os links só funcionam **depois do deploy** (`vercel --prod`). Link com slug
> errado cai em 404 de propósito.

---

## Links para enviar

| # | Pessoa | Link |
|---|--------|------|
| 1 | Akin | https://poker-pi-app.vercel.app/convite/akin |
| 2 | Davi | https://poker-pi-app.vercel.app/convite/davi |
| 3 | Guilherme | https://poker-pi-app.vercel.app/convite/guilherme |
| 4 | Henrique | https://poker-pi-app.vercel.app/convite/henrique |
| 5 | Léo | https://poker-pi-app.vercel.app/convite/leo |
| 6 | Luciano | https://poker-pi-app.vercel.app/convite/luciano |
| 7 | Marcos | https://poker-pi-app.vercel.app/convite/marcos |
| 8 | Murilo | https://poker-pi-app.vercel.app/convite/murilo |
| 9 | Nesrrala | https://poker-pi-app.vercel.app/convite/nesrrala |
| 10 | Nicolas | https://poker-pi-app.vercel.app/convite/nicolas |
| 11 | Pedro | https://poker-pi-app.vercel.app/convite/pedro |
| 12 | Rafael | https://poker-pi-app.vercel.app/convite/rafael |
| 13 | Rafik | https://poker-pi-app.vercel.app/convite/rafik |
| 14 | Ramon | https://poker-pi-app.vercel.app/convite/ramon |
| 15 | Vinícius | https://poker-pi-app.vercel.app/convite/vinicius |

---

## Para copiar e colar (um por linha)

```
Akin       https://poker-pi-app.vercel.app/convite/akin
Davi       https://poker-pi-app.vercel.app/convite/davi
Guilherme  https://poker-pi-app.vercel.app/convite/guilherme
Henrique   https://poker-pi-app.vercel.app/convite/henrique
Léo        https://poker-pi-app.vercel.app/convite/leo
Luciano    https://poker-pi-app.vercel.app/convite/luciano
Marcos     https://poker-pi-app.vercel.app/convite/marcos
Murilo     https://poker-pi-app.vercel.app/convite/murilo
Nesrrala   https://poker-pi-app.vercel.app/convite/nesrrala
Nicolas    https://poker-pi-app.vercel.app/convite/nicolas
Pedro      https://poker-pi-app.vercel.app/convite/pedro
Rafael     https://poker-pi-app.vercel.app/convite/rafael
Rafik      https://poker-pi-app.vercel.app/convite/rafik
Ramon      https://poker-pi-app.vercel.app/convite/ramon
Vinícius   https://poker-pi-app.vercel.app/convite/vinicius
```

---

## Banner do WhatsApp (preview do link)

Cada link tem um **banner personalizado** com o nome da pessoa (a imagem grande
que aparece no WhatsApp/Telegram/iMessage ao colar o link).

- **Tamanho:** 1200×630 px (o que dispara o preview grande), ~70 KB.
- **Template:** `app/(public)/convite/[slug]/opengraph-image.tsx` — gerado na hora
  por pessoa; qualquer slug novo ganha o banner sozinho.
- ⚠️ **Cache do WhatsApp:** o preview é guardado na 1ª vez que o link é lido.
  Se você testou um link ANTES do banner existir, o WhatsApp pode mostrar o
  preview antigo por um tempo. Pra forçar atualização, gere o preview de novo no
  [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  (cola o link e clica "Scrape Again").

## Detalhes técnicos (referência)

- **Vídeos:** hospedados no Cloudinary (cloud `dolxad4w1`), pasta `convites/`.
- **Mapa slug → vídeo:** `app/(public)/inscrever/convites.ts` (gerado automaticamente).
- **Rota:** `app/(public)/convite/[slug]/page.tsx`.
- **Banner OG:** `app/(public)/convite/[slug]/opengraph-image.tsx`.
- **Para trocar/re-subir vídeos:** ponha os arquivos na pasta de origem, ajuste a
  lista `PEOPLE` em `scripts/upload-convites.mjs` e rode:
  ```
  node --env-file=.env.local scripts/upload-convites.mjs
  ```
  O script sobe os vídeos e regenera o `convites.ts` sozinho.
