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
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#0a0a0c;color:#f2f3f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px">
    <tr><td style="text-align:center">
      <div style="font-size:40px;color:#d9b876;font-weight:bold">π</div>
      <h1 style="color:#d9b876;font-size:22px;margin:8px 0 0">Seu ingresso está confirmado</h1>
    </td></tr>
    <tr><td style="padding:24px 0">
      <p style="font-size:16px">Olá, <strong>${p.buyerName}</strong>! Te esperamos no <strong>Poker Pi</strong>.</p>
      <table width="100%" style="background:#131418;border:1px solid #26272c;border-radius:12px;padding:16px;margin-top:12px">
        <tr><td style="color:#9aa0aa;font-size:13px">Ingresso</td><td style="text-align:right;color:#d9b876;font-weight:bold">${p.ticketName}</td></tr>
        <tr><td style="color:#9aa0aa;font-size:13px;padding-top:8px">Quando</td><td style="text-align:right;padding-top:8px">${p.whenText}</td></tr>
        <tr><td style="color:#9aa0aa;font-size:13px;padding-top:8px">Onde</td><td style="text-align:right;padding-top:8px">${p.locationText}</td></tr>
      </table>
      <p style="text-align:center;margin-top:24px">
        <a href="${p.ticketUrl}" style="display:inline-block;background:#d9b876;color:#0a0a0c;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">Abrir meu ingresso (QR)</a>
      </p>
      <p style="text-align:center;color:#9aa0aa;font-size:13px">Apresente o QR Code deste link na entrada.</p>
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
    subject: "🎟️ Seu ingresso — Poker Pi",
    html: buildTicketEmailHtml(p),
  });
}
