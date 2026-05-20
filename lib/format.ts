import { format as formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata centavos como "R$ X,XX" (pt-BR).
 */
export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Formata uma data ISO em pt-BR. Patterns típicos:
 *   "dd 'de' MMMM 'de' yyyy"  → "23 de maio de 2026"
 *   "dd/MM/yyyy 'às' HH:mm"   → "23/05/2026 às 20:30"
 */
export function formatDateBR(iso: string, pattern = "dd/MM/yyyy 'às' HH:mm"): string {
  return formatDate(new Date(iso), pattern, { locale: ptBR });
}
