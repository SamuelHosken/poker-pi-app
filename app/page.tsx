// A raiz "/" serve a MESMA LP de "/pokerpi" (a vitrine do evento).
// Reaproveita a página inteira via re-export, então "/" e "/pokerpi"
// renderizam identicamente. A home antiga (components/home/*) fica
// preservada no repo, mas fora de rota.
export { default, generateMetadata } from "./(public)/pokerpi/page";

export const dynamic = "force-dynamic";
