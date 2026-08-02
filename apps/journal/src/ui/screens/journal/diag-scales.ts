/**
 * Четыре шкалы диагностики (component-report §10.6, `DC:1163`, `DC:1311`).
 *
 * Ключ `balance` подписан «СЛАДОСТЬ» — расхождение имени поля и подписи
 * намеренное и перенесено как есть: поле называется балансом с первой версии
 * прототипа, а спрашивают у человека про сладость. Переименование поля сломало
 * бы уже сохранённые записи, переименование подписи — вопрос.
 *
 * Шкала — не слайдер: 11 ячеек 0…10, тап ставит значение. Ячейка залита, если
 * её индекс не больше значения, поэтому «0» — это одна залитая ячейка, а не
 * пустая строка.
 */

import { STR, type StrKey } from '../../../data/strings.js';
import type { Diagnostics, Lang } from '../../../db/schema.js';

/** Поле диагностики. */
export type ScaleKey = keyof Diagnostics;

export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** Ячеек в шкале — 11: значения 0…10 включительно. */
export const SCALE_CELLS = SCALE_MAX - SCALE_MIN + 1;

export interface Scale {
  readonly key: ScaleKey;
  /** Ключ подписи. `balance` → «СЛАДОСТЬ» — см. шапку файла. */
  readonly label: StrKey;
}

/** Порядок шкал на экране. Он же порядок в строке диагностики на детали. */
export const SCALES: readonly Scale[] = [
  { key: 'acid', label: 'diag_acid' },
  { key: 'bitter', label: 'diag_bitter' },
  { key: 'body', label: 'diag_body' },
  { key: 'balance', label: 'diag_balance' },
];

/** Значение стартовой диагностики — середина каждой шкалы (`DC:1033`). */
export const START_DIAG: Readonly<Diagnostics> = Object.freeze({
  acid: 5,
  bitter: 5,
  body: 5,
  balance: 5,
});

/** Зажим в пределы шкалы. Нецелые значения округляются: ячеек всего 11. */
export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return SCALE_MIN;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value)));
}

/** Новая диагностика с одной изменённой шкалой. Исходная не трогается. */
export function setScale(diag: Diagnostics, key: ScaleKey, value: number): Diagnostics {
  return { ...diag, [key]: clampScale(value) };
}

/** Залита ли ячейка `index` при значении `value` (`DC:1311`). */
export function cellFilled(value: number, index: number): boolean {
  return index <= value;
}

/**
 * Диагностика строкой: «К 5 · Г 4 · Т 6 · С 6» (`DC:1335`).
 *
 * Буква — первая от подписи (в английском две: «AC 5 · BI 4 · BO 6 · SW 6»),
 * потому что подписи целиком в строку не влезают, а порядок шкал постоянный.
 */
export function diagLine(diag: Diagnostics, lang: Lang): string {
  const take = lang === 'ru' ? 1 : 2;
  return SCALES.map((s) => `${STR[lang][s.label].slice(0, take)} ${diag[s.key]}`).join(' · ');
}
