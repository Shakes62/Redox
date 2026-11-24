/**
 * Shop order: the sequence products appear in on the homepage, the shop and
 * search. The admin arranges it; the first entry shows first.
 *
 * Pure helpers, shared by the admin panel and the API that saves the order.
 */

/** Longest list the API accepts — far beyond any real catalogue. */
export const MAX_ORDERED_PRODUCTS = 2000;

/** Product ids are stored as VARCHAR(100). */
const MAX_ID_LENGTH = 100;

/** Moves one entry to a new index, keeping everything else in order. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  if (target === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/** Puts one product first and leaves the rest exactly where they were. */
export function moveToFront(ids: readonly string[], id: string): string[] {
  const from = ids.indexOf(id);
  return from === -1 ? [...ids] : moveItem(ids, from, 0);
}

export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Validates an order sent to the API: a non-empty list of distinct product ids.
 * Returns null for anything else. A duplicate means the client's list is
 * corrupt, so it is refused rather than silently repaired.
 */
export function parseProductOrder(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ORDERED_PRODUCTS) return null;

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const value of input) {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (!id || id.length > MAX_ID_LENGTH || seen.has(id)) return null;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}
