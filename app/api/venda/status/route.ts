import { NextResponse } from "next/server";
import { rawServiceClient } from "@/lib/tournament/auth";
import { getAbacatePixStatus, isAbacatePaidStatus } from "@/lib/payments/abacate";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { buildWebhookDeps } from "@/lib/tickets/webhook-deps";
import { corsHeaders, preflight } from "@/lib/tickets/cors";

export const dynamic = "force-dynamic";

/*
  O estado de um pedido, para a tela do comprador se atualizar sozinha enquanto
  ele paga.

  ELA NAO E SO UMA CONSULTA: quando o nosso banco ainda diz `pending`, ela
  pergunta ao gateway e, se o dinheiro entrou, CONFIRMA ali mesmo, pelo mesmo
  `processWebhookEvent` do webhook. Isso e de proposito, e e a peca que torna a
  compra robusta:

  - Se o webhook chegar primeiro, esta rota so le o resultado. Barato.
  - Se o webhook atrasar, se perder, ou se for RECUSADO (a duvida em aberto
    sobre qual chave a AbacatePay usa no HMAC), o comprador que ficou olhando a
    tela confirma o proprio pagamento sem saber. Nao existe caminho em que o
    dinheiro entra e o ingresso nao sai enquanto a aba estiver aberta.

  Idempotencia e do `markPaid`, que e UPDATE condicional: webhook e polling
  chegando juntos nao emitem dois ingressos nem dois e-mails.

  O QUE ELA NAO DEVOLVE: nome, e-mail, CPF, valor, e principalmente o
  `qr_token`, que e a credencial do ingresso. Só o estado. Quem tem o id do
  pedido e quem acabou de cria-lo, mas mesmo assim nada alem do necessario sai
  daqui.
*/

type Estado = "pendente" | "pago" | "expirado" | "cancelado" | "desconhecido";

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const cors = { ...corsHeaders(req.headers.get("origin")), "Cache-Control": "no-store" };
  const ticketId = new URL(req.url).searchParams.get("ticketId")?.trim();

  const responder = (estado: Estado) => NextResponse.json({ estado }, { headers: cors });

  // Formato antes de ir ao banco: sem isto, qualquer texto vira uma query.
  if (!ticketId || !/^[0-9a-f-]{36}$/i.test(ticketId)) return responder("desconhecido");

  const db = rawServiceClient();
  const { data } = await db
    .from("tickets")
    .select("id,status,abacate_charge_id")
    .eq("id", ticketId)
    .maybeSingle();
  const t = data as { id: string; status: string; abacate_charge_id: string | null } | null;

  if (!t) return responder("desconhecido");
  if (t.status === "paid") return responder("pago");
  if (t.status === "canceled" || t.status === "refunded") return responder("cancelado");
  if (t.status !== "pending" || !t.abacate_charge_id) return responder("pendente");

  /*
    Ainda pendente do nosso lado. Pergunta ao gateway antes de responder: e a
    diferenca entre a tela dizer a verdade e a tela repetir uma verdade velha.
  */
  try {
    const st = await getAbacatePixStatus(t.abacate_charge_id);

    if (isAbacatePaidStatus(st.status)) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      /*
        O resultado nao muda a resposta, e por isso nao e lido: o gateway acabou
        de dizer que o dinheiro entrou, entao para o comprador esta pago. Um
        `handled: false` aqui significa "o webhook chegou primeiro e ja
        confirmou", que da no mesmo. A chamada existe pelo EFEITO (marcar pago,
        gerar o QR e mandar o e-mail), nao pelo retorno.
      */
      await processWebhookEvent(
        { event: "transparent.completed", data: { id: t.abacate_charge_id } },
        buildWebhookDeps(db, siteUrl),
      );
      return responder("pago");
    }

    if (st.status === "EXPIRED") return responder("expirado");
    return responder("pendente");
  } catch {
    // Gateway fora do ar nao vira erro na tela: a compra segue pendente e o
    // proximo poll tenta de novo.
    return responder("pendente");
  }
}
