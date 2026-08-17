import { trackEvent } from "@/lib/analytics/track";
import { sanearRastro } from "@/lib/analytics/rastro";
import { idDaEdicaoEmVenda } from "@/lib/tickets/orders";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import { corsHeaders, preflight } from "@/lib/tickets/cors";

export const dynamic = "force-dynamic";

/*
  O funil da LP, contado de fora deste dominio.

  Ela existe porque a pagina de venda mudou de casa. Na 2a edicao a LP era
  `/pokerpi`, deste projeto, e o rastreio era Server Action direta. A LP da 3a e
  `mesapigroup.com/3edicao`, do projeto `home`, e Server Action nao atravessa
  aplicacao. Sem esta porta, o painel de `/admin/dashboard` mostra zero visita
  para sempre: foi exatamente o que ele mostrou entre 12 e 14/08.

  TRES COISAS QUE ESTA ROTA NAO ACEITA DO CLIENTE:

  - **O nome do evento, se for de dinheiro.** `order_created`, `order_failed` e
    `paid` sao escritos pelo servidor, de dentro da compra e do webhook. A lista
    do que o navegador pode gravar esta em `lib/analytics/rastro.ts`, com teste.
  - **A edicao.** Sai de `sales_open` aqui dentro. Aceitar do corpo deixaria
    qualquer um pendurar visita inventada na edicao que quisesse.
  - **`meta`.** E `jsonb` sem forma, e rota publica com campo livre e deposito de
    texto de graca.

  Responde 204 SEMPRE, ate quando recusa. Rastreio nao e conversa: nao ha o que
  o navegador possa fazer com a resposta, e um corpo de erro so contaria a quem
  esta sondando qual evento existe e se a venda esta aberta.
*/

const VAZIO = { status: 204 as const };

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const nada = () => new Response(null, { ...VAZIO, headers: cors });

  /*
    Amortecedor de rajada, nao proteger de verdade: em serverless cada instancia
    tem o contador dela, e o proprio `in-memory.ts` diz isso em voz alta.

    O TETO SUBIU DE 60 PARA 300 quando a LP passou a medir as doze areas. Uma
    visita gerava de 1 a 5 eventos; hoje quem rola a pagina inteira gera ate 19
    (page_view + doze areas + os seis toques). Com 60 cabiam tres visitantes por
    minuto por IP, e operadora de celular poe milhares de pessoas atras do mesmo
    endereco: uma rajada vinda de um story do Instagram seria cortada no meio da
    pagina, e a tela desenharia uma queda que nunca aconteceu. Rate limit que
    corta gente de verdade deixou de ser protecao e virou regra de negocio
    errada.

    Trezentos cabem quinze visitantes simultaneos por IP. E o que sobra de
    protecao continua servindo: inflar NUMERO por aqui nao da, porque a tela
    conta sessoes distintas e um laco de `curl` repete a mesma. O que o limite
    ainda evita e engordar a tabela de graca.
  */
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "desconhecido";
  try {
    checkRateLimit(`rastro:${ip}`, 300, 60_000);
  } catch {
    // Passou do limite: engole. Quem visita de verdade nunca chega aqui, e
    // devolver 429 so ensinaria o abusador a ajustar o passo.
    return nada();
  }

  const body = await req.json().catch(() => null);
  const rastro = sanearRastro(body);
  if (!rastro) return nada();

  /*
    A edicao sai daqui, e `null` quando nao ha venda aberta. Visita com a venda
    fechada continua sendo visita: a linha entra sem evento, e o painel (que
    filtra por `event_id`) simplesmente nao a conta. Melhor do que perder o
    registro ou, pior, pendura-lo na edicao errada.

    O `try` em volta e obrigatorio: o `trackEvent` engole os proprios erros por
    decisao escrita, mas a consulta da edicao NAO, e sem isto um Supabase fora
    do ar transforma cada visita a pagina de venda num 500 no log. Rastreio que
    faz barulho quando falha e pior do que rastreio nenhum.

    `await` e nao `void`: trabalho com efeito colateral solto antes do `return`
    morre quando a Vercel suspende o container, e o sintoma e sumico
    intermitente de registro. Ja aconteceu neste projeto com o aviso de PIX
    copiado.
  */
  try {
    const eventId = await idDaEdicaoEmVenda();
    await trackEvent({ ...rastro, eventId });
  } catch {
    // Contar e opcional. Vender, nao.
  }

  return nada();
}
