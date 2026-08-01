/**
 * Конвертер помола — тонкая обёртка над `@coffee/core`.
 *
 * D-1 спеки и D-4 задачи: математика перевода живёт **только** в ядре. Здесь
 * ровно две вещи, которых ядро не знает: как превратить свою кофемолку из базы
 * Dexie в запись каталога и как наложить пользовательскую калибровку. Прототип
 * дублировал формулу в компоненте (`DC:981`) и в `data.js` — этот дубль не
 * переносится.
 *
 * Диапазон `lo…hi` приходит из confidence-полосы ядра; константа `UNCERT = 12`
 * прототипа не портируется (D-4).
 */

import { type Grinder, convert as coreConvert, grinderById } from '@coffee/core';

import type { GrinderRecord } from '../db/schema.js';
import { applyCalib } from './calibration.js';

/** Результат для экрана конвертера: диапазон на шкале + техстрока. */
export interface GrindConversion {
  /** Размер частиц, µm. Калибровка на него не влияет. */
  microns: number;
  /** Откалиброванный центр — именно он уезжает в сетап заваривания. */
  center: number;
  lo: number;
  hi: number;
  /** Разрешение целевой шкалы, µm на шаг. */
  resolutionMicrons: number;
  /** Ответ лежит за пределами шкалы целевой кофемолки. */
  clamped: boolean;
}

/**
 * Своя кофемолка в форме записи каталога.
 *
 * Числа всегда берутся из пользовательской записи — её мог править сам
 * пользователь. Из каталога подтягивается только `confidence`, от которой
 * зависит ширина полосы; для молки, заведённой руками, доверие «оценка».
 */
export function toCoreGrinder(g: GrinderRecord): Grinder {
  const source = g.datasetId === undefined ? undefined : grinderById(g.datasetId);
  return {
    id: g.id,
    brand: source?.brand ?? '',
    model: source?.model ?? g.name,
    type: source?.type ?? 'manual',
    burr: source?.burr ?? '',
    scale: { ...g.scale },
    calibration: {
      kind: 'linear',
      micronsPerStep: g.micronsPerStep,
      zeroOffsetMicrons: g.zeroOffsetMicrons,
    },
    confidence: source?.confidence ?? 'estimated',
    sources: [],
  };
}

/**
 * Пересчёт настройки с одной своей кофемолки на другую.
 *
 * `offset` — калибровка в шагах целевой кофемолки; ноль даёт «сырой» ответ,
 * который нужен, чтобы вычислить саму калибровку
 * ({@link import('./calibration.js').computeOffset}).
 */
export function convertGrind(
  from: GrinderRecord,
  setting: number,
  to: GrinderRecord,
  offset = 0,
): GrindConversion {
  const result = coreConvert(toCoreGrinder(from), setting, toCoreGrinder(to));
  const span = applyCalib(
    { lo: result.band.low, center: result.target.snapped, hi: result.band.high },
    offset,
  );
  return {
    microns: result.microns,
    center: span.center,
    lo: span.lo,
    hi: span.hi,
    resolutionMicrons: result.resolutionMicrons,
    clamped: result.target.clamped,
  };
}
