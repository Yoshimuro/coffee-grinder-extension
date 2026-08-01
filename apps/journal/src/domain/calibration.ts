/**
 * Калибровка помола — порт `calApply`/`calReset`/подсказки из журнала
 * (component-report §5, `DC:1245-1250`).
 *
 * Смещение измеряется **в шагах целевой (своей) кофемолки** и знаковое. Оно
 * прибавляется уже после инверсии микронов в шкалу, то есть двигает весь ответ
 * целиком — и центр, и обе границы диапазона. Микроны не трогает: это
 * физическая величина, а калибруется расхождение шкал.
 */

import type { Calibration, EntryRecord } from '../db/schema.js';

/** Диапазон на шкале целевой кофемолки. */
export interface Span {
  lo: number;
  center: number;
  hi: number;
}

/** Округление прототипа: до 0.1 шага и не ниже нуля. */
const r = (x: number): number => Math.max(0, Math.round(x * 10) / 10);

/**
 * Сдвигает диапазон на `offset` шагов. Применяется ко всем трём точкам —
 * калибровка говорит «эта молка врёт на столько-то», а не «центр не там».
 */
export function applyCalib(span: Span, offset: number): Span {
  return { lo: r(span.lo + offset), center: r(span.center + offset), hi: r(span.hi + offset) };
}

/**
 * Смещение из «реально хорошей настройки»: сколько шагов пользователь добавил к
 * сырому (некалиброванному) центру, чтобы получить работающий помол.
 */
export function computeOffset(goodSetting: number, rawCenter: number): number {
  return Math.round((goodSetting - rawCenter) * 10) / 10;
}

/**
 * Лучшая запись журнала для подсказки: оценённая, с известным помолом,
 * максимальная по `diag.balance` (в интерфейсе эта шкала подписана
 * «СЛАДОСТЬ»). Прототип фильтровал по наличию `diag`; в Dexie-схеме диагностика
 * есть всегда, поэтому отбор идёт по `status === 'done'`.
 *
 * Вход не мутируется — сортируется копия.
 */
export function suggestCalibration(
  entries: readonly EntryRecord[],
): EntryRecord | undefined {
  return [...entries]
    .filter((j) => j.status === 'done' && j.grind != null)
    .sort((a, b) => b.diag.balance - a.diag.balance)[0];
}

/** Настройка близка к помолу лучшей записи — считаем, что калибровка «из журнала». */
const FROM_LOG_EPSILON = 0.05;

/**
 * Готовая настройка калибровки. `src` — id записи, из которой взято смещение,
 * либо `null` для ручного ввода (в прототипе это были литералы `'log'`/
 * `'manual'`; Dexie-схема хранит именно id, что информативнее).
 */
export function calibrationFrom(
  goodSetting: number,
  rawCenter: number,
  best?: EntryRecord,
): Calibration {
  const offset = computeOffset(goodSetting, rawCenter);
  const fromLog =
    best !== undefined &&
    best.grind != null &&
    Math.abs(goodSetting - best.grind) < FROM_LOG_EPSILON;
  return { offset, src: fromLog && best !== undefined ? best.id : null };
}

/** Сброс калибровки. */
export function resetCalibration(): Calibration {
  return { offset: 0, src: null };
}

/** Есть ли ненулевое смещение — от этого зависит строка «калибровано +N». */
export function hasCalibration(c: Calibration): boolean {
  return c.offset !== 0;
}
