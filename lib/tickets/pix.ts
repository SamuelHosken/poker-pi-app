/**
 * Config do PIX manual (fora do Asaas). Fonte unica dos valores exibidos na LP.
 * Editavel aqui se a chave / recebedor / WhatsApp mudarem.
 */
export const PIX_KEY = "pokerpi2026@gmail.com";
export const PIX_KEY_TYPE = "E-mail";
export const PIX_RECEIVER = "Joao Henrique";
/** Numero do WhatsApp (so digitos, com DDI) pra onde vai o comprovante. */
export const PIX_WHATSAPP = "5561996631580";
export const PIX_WHATSAPP_DISPLAY = "+55 61 99663-1580";

const DEFAULT_MSG =
  "Oi! Fiz o PIX do meu ingresso Poker Pi, segue o comprovante:";

/** Link wa.me pra mandar o comprovante, com uma mensagem ja preenchida. */
export function pixWhatsappLink(message: string = DEFAULT_MSG): string {
  return `https://wa.me/${PIX_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
