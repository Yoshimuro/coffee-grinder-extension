/**
 * Настройки — правила и строки CRUD кофемолок (§10.8, `DC:1339-1345`).
 *
 * Кофемолка здесь — не запись каталога, а то, что стоит на кухне: у неё есть
 * имя и цена деления в микронах, и больше конвертеру ничего не нужно.
 */

import { STR } from '../../../data/strings.js';
import type { GrinderRecord, Lang } from '../../../db/schema.js';
import type { StepperRange } from '../../components/index.js';
import { unitOf } from '../conv/model.js';

/** ШАГ, µm: ±0.5 в границах `[0.5, 40]`, дефолт 10 (`DC:1343`). */
export const STEP_RANGE: StepperRange = { min: 0.5, max: 40, step: 0.5 };
export const DEFAULT_STEP = 10;

/**
 * Шкала новой кофемолки.
 *
 * Прототип хардкодил `zero: 300, dp: 1` (`DC:1345`), и это не лень, а честное
 * умолчание: человек, вписывающий свою молку руками, цену деления примерно
 * знает, а смещение нуля — нет. 300 µm — типичный зазор в нуле у ручных
 * жерновов; 0.5 шага шкалы отвечает разрядности «4.5 клика».
 *
 * Точные числа появятся из калибровки по журналу — ровно для этого она и есть.
 */
export const NEW_GRINDER_ZERO = 300;

/** Собирает запись кофемолки из имени и цены деления. */
export function makeGrinder(id: string, name: string, micronsPerStep: number): GrinderRecord {
  return {
    id,
    name,
    micronsPerStep,
    zeroOffsetMicrons: NEW_GRINDER_ZERO,
    scale: { min: 0, max: 40, step: 0.5, unit: 'click' },
  };
}

/** Мета кофемолки в списке: «кликов · 8.7 µm» (`DC:1339`). */
export function grinderMeta(grinder: GrinderRecord, lang: Lang): string {
  return `${unitOf(grinder.scale, lang)} · ${grinder.micronsPerStep} ${STR[lang].um}`;
}

/**
 * Можно ли удалить эту кофемолку.
 *
 * Последняя не удаляется: пустой список — это сломанный конвертер и сломанный
 * сетап. Репозиторий откажет и сам (`deleteGrinder` → `'last'`), но кнопку,
 * которая заведомо ничего не сделает, показывать не нужно.
 */
export function canDelete(count: number): boolean {
  return count > 1;
}
