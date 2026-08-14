/**
 * Правка записи журнала — диапазоны и арифметика ячеек (BJ-12).
 *
 * Диапазоны здесь **шире**, чем у тех же полей в сетапе заваривания
 * (`brewing/brew-view.ts`), и это не рассинхрон: сетап отвечает на вопрос «что
 * разумно заварить», а запись — «что было на самом деле». Пять граммов в
 * дегустационной пробе и вода 40 г в записи бывают, заваривать так никто не
 * предлагает.
 *
 * Правится только то, что человек измерял. ВРЕМЯ, РЕЖИМ и КЛАПАН — следы
 * заваривания, а не его настройки: их правка означала бы, что таймер соврал.
 */

import type { EntryRecord } from '../../../db/schema.js';

/** Поля записи, у которых в режиме правки появляются −/+. */
export type EntryField = 'grind' | 'dose' | 'water' | 'temp';

export interface EntryRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** ПОМОЛ ±0.1 · 0–36 — та же шкала, что у степпера сетапа. */
export const ENTRY_RANGES: Readonly<Record<EntryField, EntryRange>> = Object.freeze({
  grind: { min: 0, max: 36, step: 0.1 },
  dose: { min: 4, max: 60, step: 0.5 },
  water: { min: 40, max: 900, step: 10 },
  temp: { min: 60, max: 100, step: 1 },
});

/**
 * Новое значение поля после тапа по −/+.
 *
 * Округление до десятых — из-за помола: `4.6 + 0.1` в двоичной арифметике даёт
 * `4.699999999999999`, и без округления запись копила бы хвост на каждом тапе.
 */
export function bumpEntryValue(current: number, delta: number, range: EntryRange): number {
  const next = Math.round((current + delta) * 10) / 10;
  return Math.min(range.max, Math.max(range.min, next));
}

/** Патч записи для одного шага степпера. Пустой — если поля у записи нет. */
export function entryFieldPatch(
  entry: EntryRecord,
  field: EntryField,
  direction: 1 | -1,
): Partial<EntryRecord> {
  const range = ENTRY_RANGES[field];
  const current = field === 'grind' ? entry.grind : entry[field];
  // Помол у молотого и дрипа — `null`: крутить нечего, ячейки в сетке нет.
  if (current === null || current === undefined) return {};
  return { [field]: bumpEntryValue(current, direction * range.step, range) };
}

/**
 * Можно ли править эту запись параметрами.
 *
 * У дегустации рецепта нет вовсе — там правится только заметка и оценка
 * (README:53 и решение по BJ-12).
 */
export function hasEditableParams(entry: EntryRecord): boolean {
  return entry.mode !== 'cup';
}
