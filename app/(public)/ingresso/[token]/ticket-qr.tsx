"use client";
import { QRCodeSVG } from "qrcode.react";

export function TicketQr({ value }: { value: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <QRCodeSVG value={value} size={240} level="M" />
    </div>
  );
}
