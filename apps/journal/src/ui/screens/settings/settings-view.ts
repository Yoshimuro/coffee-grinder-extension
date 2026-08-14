/**
 * Настройки — правила и строки CRUD кофемолок (§10.8, `DC:1339-1345`).
 *
 * Кофемолка здесь — не запись каталога, а то, что стоит на кухне: у неё есть
 * имя и цена деления в микронах, и больше конвертеру ничего не нужно.
 */

import { STR } from '../../../data/strings.js';
import { type WheelSet, nameOf } from '../../../data/wheel.js';
import type { WheelEdit } from '../../../data/wheel-edits.js';
import type { GrinderRecord, Lang } from '../../../db/schema.js';
import type { ImportFailure } from '../../../db/transfer.js';
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

/* ── Правки колеса (BJ-11) ───────────────────────────────────────────────── */

/**
 * Подпись правки в списке настроек: «добавлено: Амаретто», «скрыто: Виски»,
 * «переименовано: Скотч».
 *
 * Добавления и переименования несут свои подписи сами. Цель скрытия называет
 * набор: его цепочка fallback знает и скрытые узлы, поэтому подпись не
 * вырождается в голый id.
 */
export function wheelEditLabel(edit: WheelEdit, lang: Lang, ws: WheelSet): string {
  const t = STR[lang];
  if (edit.op === 'hide') return `${t.wheel_edit_hidden}: ${nameOf(edit.target, lang, ws)}`;
  if (edit.op === 'rename') return `${t.wheel_edit_renamed}: ${edit[lang]}`;
  return `${t.wheel_edit_added}: ${edit[lang]}`;
}

/* ── Обмен базой (BJ-6) ──────────────────────────────────────────────────── */

/** Какая из двух операций сейчас говорит. */
export type TransferOp = 'export' | 'import';

/**
 * Состояние обмена — одно на обе строки.
 *
 * Одно, а не два, потому что и экспорт, и импорт читают всю базу: запускать их
 * одновременно нечего, и строка, которая молчит, обязана показывать подсказку,
 * а не чужой результат.
 */
export type TransferState =
  | { kind: 'idle' }
  | { kind: 'busy'; op: TransferOp }
  | { kind: 'done'; op: TransferOp }
  | { kind: 'failed'; op: TransferOp; code: ImportFailure };

export const TRANSFER_IDLE: TransferState = { kind: 'idle' };

/**
 * Подпись под строкой обмена.
 *
 * Чужая строка всегда показывает свою подсказку: «база восстановлена» под
 * ЭКСПОРТОМ читалось бы как «экспорт восстановил базу».
 */
export function transferNote(state: TransferState, op: TransferOp, lang: Lang): string {
  const t = STR[lang];
  const hint = op === 'export' ? t.set_export_hint : t.set_import_hint;
  if (state.kind === 'idle' || state.op !== op) return hint;
  if (state.kind === 'busy') return t.set_busy;
  if (state.kind === 'done') return op === 'export' ? t.set_export_done : t.set_import_done;
  // Отказ бывает только у импорта, и человеку важно различить две его причины:
  // «файл не тот» лечится другим файлом, «файл битый» — не лечится ничем.
  return state.code === 'version' ? t.set_import_bad : t.set_import_broken;
}
