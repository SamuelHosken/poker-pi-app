import { NextResponse } from "next/server";
import { createTicketOrder } from "@/lib/tickets/orders";
import { corsHeaders, preflight } from "@/lib/tickets/cors";

export const dynamic = "force-dynamic";

/*
  A compra, chamada pela LP que mora em outro dominio.

  E a UNICA porta: a tela desenha e coleta, e todo o resto (preco, capacidade,
  dedup por CPF, cobranca, ticket, webhook, e-mail) acontece aqui dentro, no
  projeto que ja tem os 148 testes disso. Nao existe segunda copia da regra de
  dinheiro do outro lado.

  TRES COISAS QUE ESTA ROTA NAO ACEITA DO CLIENTE, e por que:

  - **Preco.** Vem de `ticket_types.price_cents`, lido do banco pelo
    `createTicketOrder`. Aceitar valor daqui seria vender ingresso por um real.
  - **Evento.** Sai do proprio tipo de ingresso, nunca do corpo.
  - **Metodo.** Cravado em PIX. O cartao saiu desta pagina por decisao de
    produto, e deixar o metodo vir do corpo devolveria o cartao pela porta dos
    fundos, sem a tela que explica o parcelamento.

  O que o cliente manda e so o que so ele sabe: quem e, e qual plano quer.
*/
export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  const body = (await req.json().catch(() => null)) as {
    ticketTypeId?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    cpf?: unknown;
    sessionId?: unknown;
    source?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Requisição inválida." },
      { status: 400, headers: cors },
    );
  }

  const texto = (v: unknown) => (typeof v === "string" ? v : "");

  /*
    A validacao de verdade (nome, e-mail, telefone, CPF com digito) e do Zod
    dentro do `createTicketOrder`, que devolve `field` para a tela destacar o
    campo errado. Aqui so se garante que o que chega e string, para o schema
    receber o tipo que ele espera.
  */
  const res = await createTicketOrder(
    {
      ticketTypeId: texto(body.ticketTypeId),
      name: texto(body.name),
      email: texto(body.email),
      phone: texto(body.phone),
      cpf: texto(body.cpf),
      method: "PIX",
      installments: 1,
    },
    {
      sessionId: texto(body.sessionId) || null,
      source: texto(body.source) || null,
    },
  );

  /*
    Erro de preenchimento responde 200 com `ok:false`, e nao 4xx: o cliente
    precisa ler `error` e `field` para destacar o campo, e alguns navegadores e
    proxies engolem o corpo de resposta de erro. Falha de infraestrutura, essa
    sim, sobe como excecao e vira 500 do runtime.
  */
  return NextResponse.json(res, { headers: { ...cors, "Cache-Control": "no-store" } });
}
