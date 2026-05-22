"use client";

import { useEffect } from "react";

/**
 * V1.3 — Registra o Service Worker em produção. Em dev fica off pra não atrapalhar HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Silencia — falha de registro não deve quebrar a UI
      });
  }, []);

  return null;
}
