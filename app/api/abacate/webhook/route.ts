import { NextResponse } from "next/server";
import { rawServiceClient } from "@/lib/tournament/auth";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { buildWebhookDeps } from "@/lib/tickets/webhook-deps";
import {
  ABACATE_SIGNATURE_HEADER,
  classificarAssinatura,
} from "@/lib/payments/abacate-signature";

export const dynamic = "force-dynamic";

/*
  Webhook da AbacatePay.

  DUAS COISAS QUE NAO PODEM MUDAR SEM PENSAR:

  1. O corpo e lido como TEXTO CRU, e o `JSON.parse` vem depois. A assinatura e
     do byte que chegou; um parse seguido de stringify reordena chave e a
     assinatura nunca mais bate.

  2. Falha responde 500, nao 200. O gateway re-tenta com backoff. O legado ja
     respondeu 200 em falha uma vez e o Asaas nunca re-tentava: o comprador
     pagava e nao recebia ingresso, em silencio (commit 87326ff).

  SOBRE A ASSINATURA, E POR QUE ELA TEM DOIS PESOS AQUI:

  A documentacao da AbacatePay se contradiz. O `POST /webhooks/create` exige um
  `secret` escolhido por nos, mas o exemplo de verificacao da doc assina com uma
  constante PUBLICADA na propria pagina, igual para todos os lojistas. Sob a
  segunda leitura, a assinatura nao autentica nada: quem le a doc forja.

  Em vez de apostar numa leitura, a rota trata as duas com pesos diferentes:

  - Assinada com o NOSSO segredo: prova de origem. Vale para tudo.
  - Assinada com a chave publica da doc: nao prova nada, entao so passa no
    caminho de CONFIRMAR pagamento, que reconsulta o gateway antes de marcar
    qualquer coisa como paga. Um POST forjado ali nao cria dinheiro: ele so
    provoca uma consulta que vai dizer "nao pago".
  - Sem assinatura valida: 401.

  ESTORNO exige a assinatura forte, sempre. Ele e a unica operacao destrutiva
  do webhook (libera a vaga de quem pagou), e nao tem reconsulta que o proteja.

  A primeira entrega real encerra a duvida: o log diz qual chave venceu. Quando
  souber, apagar o ramo que sobrar.
*/

const EVENTOS_DESTRUTIVOS = new Set(["transparent.refunded"]);

export async function POST(req: Request) {
  const raw = await req.text();
  const assinatura = req.headers.get(ABACATE_SIGNATURE_HEADER);
  const forca = classificarAssinatura(
    raw,
    assinatura,
    process.env.ABACATE_WEBHOOK_SECRET ?? "",
  );

  if (forca === "nenhuma") {
    console.error("[abacate webhook] assinatura invalida ou ausente");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Diz qual leitura da doc esta certa. E a informacao que encerra o ponto em
  // aberto, e ela so aparece numa entrega de verdade.
  console.info(`[abacate webhook] assinatura verificada pela chave: ${forca}`);

  const payload = (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  })();
  if (!payload) {
    // Corpo ilegivel nao vai melhorar em re-tentativa: 400, e nao 500.
    return NextResponse.json({ ok: false, reason: "corpo não é JSON" }, { status: 400 });
  }

  const evento = (payload as { event?: string }).event;
  if (evento && EVENTOS_DESTRUTIVOS.has(evento) && forca !== "nossa") {
    console.error(
      `[abacate webhook] ${evento} recusado: exige assinatura com o nosso segredo, veio "${forca}"`,
    );
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const result = await processWebhookEvent(payload, buildWebhookDeps(db, siteUrl));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Loga o detalhe no servidor e responde generico: nao vazar nome de tabela
    // nem mensagem crua do Postgres. O 500 e o que faz o gateway re-tentar.
    console.error("[abacate webhook] falhou:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
