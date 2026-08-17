import { NextResponse } from "next/server";
import { getActiveEventPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { corsHeaders, preflight } from "@/lib/tickets/cors";

export const dynamic = "force-dynamic";

/*
  O estoque e os planos da edicao em venda, para a LP de fora deste dominio.

  Existe porque a `/3edicao` anunciava `ocupados: 7` escrito a mao num arquivo,
  com um comentario admitindo que era chute. Numero de vaga escrito a mao mente
  no dia em que alguem esquece de atualizar, e o jeito de mentir e sempre o pior:
  vender a cadeira trinta e um.

  So devolve o que a vitrine precisa desenhar. NAO devolve comprador, CPF,
  e-mail, nem id de ingresso: e rota publica, e o que sai daqui e lido por
  qualquer um.
*/
export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const data = await getActiveEventPublic();

  if (!data) {
    // Sem edicao em venda a LP some com o botao em vez de errar.
    return NextResponse.json(
      { aberta: false as const },
      { headers: { ...cors, "Cache-Control": "no-store" } },
    );
  }

  const { event, ticketTypes, soldCount } = data;
  const cabe = hasCapacity(soldCount, event.capacity);

  return NextResponse.json(
    {
      aberta: true as const,
      evento: {
        nome: event.name,
        comecaEm: event.startsAt,
        local: event.locationText,
        capacidade: event.capacity,
      },
      vendidos: soldCount,
      esgotado: !cabe,
      planos: ticketTypes.map((t) => ({
        id: t.id,
        nome: t.name,
        descricao: t.description,
        precoCents: t.priceCents,
      })),
    },
    {
      headers: {
        ...cors,
        /*
          Nunca cacheado. E contagem de vaga: servir trinta segundos de atraso
          aqui e servir "ainda tem lugar" para quem chegou depois de esgotar.
        */
        "Cache-Control": "no-store",
      },
    },
  );
}
