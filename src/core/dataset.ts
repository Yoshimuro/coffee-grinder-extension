import bundled from '../generated/dataset.json';
import type { Dataset, Grinder } from './types.js';

/**
 * The dataset compiled into the extension. Measured at ~445 bytes per grinder
 * raw and ~100 bytes gzipped, so even a thousand entries stays around 100 KB on
 * the wire — comfortably shippable, which is why there is no backend here.
 */
export const DATASET = bundled as unknown as Dataset;

export function allGrinders(dataset: Dataset = DATASET): Grinder[] {
  return dataset.grinders;
}

export function grinderById(id: string, dataset: Dataset = DATASET): Grinder | undefined {
  return dataset.grinders.find((g) => g.id === id);
}

export function displayName(grinder: Grinder): string {
  return `${grinder.brand} ${grinder.model}`;
}

/**
 * Substring search over brand, model and aliases. Every whitespace-separated
 * term must match somewhere, so "1z jx" narrows the way a user expects.
 */
export function searchGrinders(query: string, dataset: Dataset = DATASET): Grinder[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return dataset.grinders;

  return dataset.grinders.filter((g) => {
    const haystack = [g.brand, g.model, ...(g.aliases ?? [])].join(' ').toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/** Grinders grouped by brand, both levels alphabetical. Drives the picker. */
export function groupByBrand(grinders: Grinder[]): Array<[string, Grinder[]]> {
  const map = new Map<string, Grinder[]>();
  for (const g of grinders) {
    const list = map.get(g.brand);
    if (list) list.push(g);
    else map.set(g.brand, [g]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
