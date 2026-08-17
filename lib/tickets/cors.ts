/**
 * Quem pode chamar as rotas de venda de fora deste domínio.
 *
 * A tela da compra mora em `mesapigroup.com/3edicao` (projeto `home`) e o
 * dinheiro mora aqui, em `ingressos.mesapigroup.com`. São origens diferentes,
 * então o navegador exige CORS.
 *
 * Lista fechada, e não `*`. Com `*` qualquer site do mundo poderia montar um
 * formulário que cria cobrança em nome da casa: não roubaria dinheiro (a
 * cobrança é do nosso Pix), mas encheria a base de pendentes e queimaria o
 * limite por CPF de compradores reais.
 *
 * O eco da origem, em vez de devolver a lista, é obrigatório: `Access-Control-
 * Allow-Origin` aceita um valor só.
 */
const ORIGENS = new Set([
  "https://mesapigroup.com",
  "https://www.mesapigroup.com",
  // Desenvolvimento da `home`, que roda na 3000 enquanto este projeto roda na 3001.
  "http://localhost:3000",
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ORIGENS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Sem isto o navegador pode servir a resposta de uma origem para outra.
    Vary: "Origin",
  };
}

/** Resposta do preflight. Sem corpo, só os cabeçalhos. */
export function preflight(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
