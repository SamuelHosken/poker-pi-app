/** Há vaga se ainda não atingiu a lotação. capacity null = sem limite. */
export function hasCapacity(paidCount: number, capacity: number | null): boolean {
  if (capacity == null) return true;
  return paidCount < capacity;
}
