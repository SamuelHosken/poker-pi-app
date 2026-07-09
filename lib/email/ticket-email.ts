import QRCode from "qrcode";
import { Resend } from "resend";

const FROM = "Poker Pi <ingressos@mesapigroup.com>";
const REPLY_TO = "pokerpi2026@gmail.com";

export function buildTicketEmailHtml(p: {
  buyerName: string;
  ticketName: string;
  whenText: string;
  locationText: string;
  ticketUrl: string;
}): string {
  const origin = p.ticketUrl.split("/ingresso/")[0] || "";
  // QR servido por rota própria (Gmail bloqueia data: URI em <img>).
  const qrImageUrl = p.ticketUrl.replace("/ingresso/", "/api/qr/");
  const logoUrl = `${origin}/event/email-logo.png`;
  const isOpenBar = /open\s*bar/i.test(p.ticketName);
  const planLabel = (isOpenBar ? "Open Bar" : p.ticketName).toUpperCase();

  // Paleta da LP: creme + vermelho-tomate + dark quente, fonte condensada.
  const CREAM = "#f4ede1";
  const RED = "#cd0000";
  const INK = "#17120f";
  const INK_2 = "#1f1813";
  const BORDER = "#322820";
  const MUTED = "#b6a392";
  const DISPLAY = "'Big Shoulders Display','Arial Narrow',Arial,sans-serif";
  const BODY = "Arial,Helvetica,sans-serif";

  // Ícone de espada (glifo de texto, monocromático, à prova de qualquer cliente).
  const spade = `<span style="color:${CREAM};">&#9824;</span>`;
  // Open Bar ganha pílula com degradê (luz vermelha), padrão é vermelho liso.
  const planPill = isOpenBar
    ? `<span style="display:inline-block;background:${RED};background:linear-gradient(90deg,#ff4a1e 0%,${RED} 45%,#6e0000 100%);color:${CREAM};font-family:${DISPLAY};font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;padding:11px 26px;border-radius:999px;">${spade}&nbsp; ${planLabel}</span>`
    : `<span style="display:inline-block;background:${RED};color:${CREAM};font-family:${DISPLAY};font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;padding:11px 26px;border-radius:999px;">${spade}&nbsp; ${planLabel}</span>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="x-apple-disable-message-reformatting">
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Seu lugar na mesa está garantido. Apresente o QR Code na entrada.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};">
    <tr><td align="center" style="padding:24px 14px 44px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${INK};border:1px solid ${BORDER};border-radius:24px;overflow:hidden;font-family:${BODY};">

        <!-- Faixa vermelha + marca -->
        <tr><td style="background:${RED};padding:26px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td style="background:${INK};border-radius:50%;width:48px;height:48px;text-align:center;vertical-align:middle;">
              <img src="${logoUrl}" width="32" height="32" alt="Poker Pi" style="display:inline-block;vertical-align:middle;border-radius:50%;">
            </td>
            <td style="padding-left:12px;font-family:${DISPLAY};font-size:26px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${CREAM};">Poker&nbsp;Pi</td>
          </tr></table>
        </td></tr>

        <!-- Título -->
        <tr><td style="padding:34px 30px 6px;">
          <div style="font-family:${DISPLAY};font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${RED};">Ingresso confirmado</div>
          <div style="margin-top:8px;font-family:${DISPLAY};font-size:46px;line-height:0.95;font-weight:800;text-transform:uppercase;color:${CREAM};">Seu lugar<br>está garantido</div>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.5;color:${CREAM};">Olá, <strong style="color:${CREAM};">${p.buyerName}</strong>. Te esperamos na mesa. Guarde este e-mail: o QR abaixo é a sua entrada.</p>
        </td></tr>

        <!-- QR em cartão branco -->
        <tr><td align="center" style="padding:26px 30px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="background:${CREAM};border-radius:22px;">
            <tr><td style="padding:20px;">
              <img src="${qrImageUrl}" width="230" height="230" alt="QR Code do ingresso" style="display:block;width:230px;height:230px;">
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-family:${DISPLAY};font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">Apresente na entrada</p>
        </td></tr>

        <!-- Plano -->
        <tr><td align="center" style="padding:18px 30px 6px;">${planPill}</td></tr>

        <!-- Detalhes -->
        <tr><td style="padding:18px 30px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK_2};border:1px solid ${BORDER};border-radius:16px;">
            <tr><td style="padding:16px 18px;border-bottom:1px solid ${BORDER};">
              <div style="font-family:${DISPLAY};font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:${RED};">Quando</div>
              <div style="margin-top:3px;font-size:16px;color:${CREAM};">${p.whenText}</div>
            </td></tr>
            <tr><td style="padding:16px 18px;">
              <div style="font-family:${DISPLAY};font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:${RED};">Onde</div>
              <div style="margin-top:3px;font-size:16px;color:${CREAM};">${p.locationText}</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Botão -->
        <tr><td align="center" style="padding:24px 30px 10px;">
          <a href="${p.ticketUrl}" style="display:inline-block;background:${RED};color:${CREAM};text-decoration:none;font-family:${DISPLAY};font-weight:bold;font-size:18px;text-transform:uppercase;letter-spacing:1px;padding:16px 40px;border-radius:999px;">Abrir meu ingresso</a>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:22px 30px 30px;text-align:center;border-top:1px solid ${BORDER};">
          <div style="font-family:${DISPLAY};font-size:15px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${CREAM};">Poker Pi</div>
          <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">Ingresso pessoal. Em caso de dúvida, é só responder este e-mail.<br>${p.locationText}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 480, margin: 1 });
}

export async function sendTicketEmail(p: {
  to: string;
  buyerName: string;
  ticketName: string;
  whenText: string;
  locationText: string;
  ticketUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // e-mail é complementar; QR na tela já entrega
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: p.to,
    subject: "Seu ingresso · Poker Pi",
    html: buildTicketEmailHtml(p),
  });
}
