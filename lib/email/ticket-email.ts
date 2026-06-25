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
  const planLabel = isOpenBar ? "🥃 Open Bar" : p.ticketName;

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#0a0a0c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;">
    <tr><td align="center" style="padding:28px 16px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#0d0e11;border:1px solid #26272c;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

        <!-- Cabeçalho -->
        <tr><td style="background:linear-gradient(180deg,#15110a 0%,#0d0e11 100%);padding:32px 28px 24px;text-align:center;border-bottom:1px solid #26272c;">
          <img src="${logoUrl}" width="52" height="52" alt="Poker Pi" style="display:inline-block;border-radius:50%;">
          <div style="margin-top:12px;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#d9b876;font-weight:bold;">Poker&nbsp;Pi</div>
          <div style="margin-top:14px;font-size:22px;color:#f2f3f5;font-weight:bold;">Ingresso confirmado ✦</div>
        </td></tr>

        <!-- Saudação -->
        <tr><td style="padding:26px 28px 6px;">
          <p style="margin:0;font-size:16px;line-height:1.5;color:#f2f3f5;">Olá, <strong>${p.buyerName}</strong>, seu lugar na mesa está garantido. 🎉</p>
        </td></tr>

        <!-- QR -->
        <tr><td align="center" style="padding:18px 28px 6px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;">
            <tr><td style="padding:16px;">
              <img src="${qrImageUrl}" width="220" height="220" alt="QR Code do ingresso" style="display:block;width:220px;height:220px;">
            </td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#9aa0aa;">Apresente este QR Code na entrada</p>
        </td></tr>

        <!-- Plano -->
        <tr><td align="center" style="padding:14px 28px 4px;">
          <span style="display:inline-block;background:#d9b876;color:#0a0a0c;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:8px 20px;border-radius:999px;">${planLabel}</span>
        </td></tr>

        <!-- Detalhes -->
        <tr><td style="padding:18px 28px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#131418;border:1px solid #26272c;border-radius:14px;">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #1f2024;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6c707a;">Quando</span><br>
              <span style="font-size:15px;color:#f2f3f5;">${p.whenText}</span>
            </td></tr>
            <tr><td style="padding:14px 16px;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6c707a;">Onde</span><br>
              <span style="font-size:15px;color:#f2f3f5;">${p.locationText}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Botão -->
        <tr><td align="center" style="padding:22px 28px 8px;">
          <a href="${p.ticketUrl}" style="display:inline-block;background:#d9b876;color:#0a0a0c;text-decoration:none;font-weight:bold;font-size:15px;padding:15px 34px;border-radius:999px;">Abrir meu ingresso</a>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:20px 28px 28px;text-align:center;border-top:1px solid #26272c;margin-top:10px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6c707a;">Guarde este e-mail. Em caso de dúvida, é só responder.<br>Poker Pi · ${p.locationText}</p>
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
    subject: "🎟️ Seu ingresso · Poker Pi",
    html: buildTicketEmailHtml(p),
  });
}
