import crypto from "node:crypto";

/**
 * Verificação da assinatura do webhook da AbacatePay.
 *
 * HMAC-SHA256 do CORPO CRU, em base64, no header `x-webhook-signature`.
 *
 * "Corpo cru" é literal: tem que ser a string exata que chegou na requisição.
 * Um `JSON.parse` seguido de `JSON.stringify` reordena chave e muda espaço, e
 * a assinatura passa a não bater nunca. Por isso a rota lê `await req.text()`
 * e só depois faz o parse.
 *
 * ATENÇÃO, PONTO EM ABERTO DE SEGURANÇA: a documentação da AbacatePay é
 * contraditória sobre QUAL é a chave do HMAC. O `POST /webhooks/create` exige
 * um campo `secret`, escolhido por nós, mas o exemplo de verificação da doc usa
 * uma constante longa PUBLICADA na própria página, igual para todo mundo. Se a
 * chave for mesmo essa constante pública, a assinatura não autentica nada:
 * qualquer pessoa que leia a doc consegue forjar um webhook válido.
 *
 * Por isso esta função recebe a chave por parâmetro em vez de embutir qualquer
 * uma das duas, e por isso a rota NÃO deve tratar a assinatura como única
 * prova de origem até isso ser confirmado com uma entrega real. Enquanto não
 * for, vale a regra que já existe nos outros caminhos de dinheiro deste repo:
 * reconsultar o gateway antes de marcar qualquer coisa como paga.
 */

/** Header onde a assinatura chega. Minúsculo: header de HTTP não diferencia caixa. */
export const ABACATE_SIGNATURE_HEADER = "x-webhook-signature";

/*
  A constante que a documentação da AbacatePay usa como chave do HMAC no exemplo
  de verificação. Está PUBLICADA na página deles, igual para todo mundo.

  Ela está aqui porque a rota precisa reconhecer os dois mundos possíveis
  enquanto a dúvida não se resolve, e NÃO porque ela autentica alguma coisa: uma
  chave pública de HMAC não prova origem nenhuma, qualquer pessoa que leia a doc
  assina um corpo igual. Por isso quem verifica com ela nunca pode tomar decisão
  destrutiva. Ver a rota do webhook.
*/
export const ABACATE_CHAVE_PUBLICA_DOC =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

/**
 * Qual chave assinou este corpo: a nossa (forte, prova origem), a pública da
 * documentação (fraca, não prova nada), ou nenhuma.
 *
 * Existe para a rota poder ser correta sob as DUAS leituras da documentação no
 * primeiro dia, sem apostar em uma delas, e para o log dizer qual venceu: a
 * primeira entrega real encerra a dúvida e esta função pode encolher depois.
 */
export type ForcaDaAssinatura = "nossa" | "publica" | "nenhuma";

export function classificarAssinatura(
  rawBody: string,
  signatureFromHeader: string | null | undefined,
  nossoSegredo: string,
): ForcaDaAssinatura {
  if (nossoSegredo && verifyAbacateSignature(rawBody, signatureFromHeader, nossoSegredo)) {
    return "nossa";
  }
  if (verifyAbacateSignature(rawBody, signatureFromHeader, ABACATE_CHAVE_PUBLICA_DOC)) {
    return "publica";
  }
  return "nenhuma";
}

/** Assinatura esperada para um corpo. Exportada para o teste e para depuração. */
export function signAbacatePayload(rawBody: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");
}

/**
 * Confere a assinatura. Nunca lança: entrada malformada é assinatura inválida,
 * não erro de servidor, senão um POST torto vira 500 e o gateway fica
 * re-tentando para sempre.
 */
export function verifyAbacateSignature(
  rawBody: string,
  signatureFromHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureFromHeader || !secret) return false;

  let expected: string;
  try {
    expected = signAbacatePayload(rawBody, secret);
  } catch {
    return false;
  }

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureFromHeader, "utf8");
  // O tamanho é comparado antes porque timingSafeEqual LANÇA com buffers de
  // tamanhos diferentes, em vez de devolver false.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
