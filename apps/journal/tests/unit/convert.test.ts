import { describe, expect, it } from 'vitest';

import type { GrinderRecord } from '../../src/db/schema.js';
import { convertGrind, toCoreGrinder } from '../../src/domain/convert.js';

const c40: GrinderRecord = {
  id: 'c40',
  name: 'Comandante C40 MK4',
  datasetId: 'comandante-c40-mk4',
  micronsPerStep: 30,
  zeroOffsetMicrons: 0,
  scale: { min: 0, max: 60, step: 1, unit: 'click' },
};

const s3: GrinderRecord = {
  id: 's3',
  name: 'Timemore Chestnut S3',
  datasetId: 'timemore-s3',
  micronsPerStep: 86.7,
  zeroOffsetMicrons: 330,
  scale: { min: 0, max: 9, step: 0.1, unit: 'mark' },
};

/** Молка, заведённая руками: в каталоге её нет. */
const own: GrinderRecord = {
  id: 'own',
  name: 'Своя',
  micronsPerStep: 20,
  zeroOffsetMicrons: 100,
  scale: { min: 0, max: 50, step: 1, unit: 'click' },
};

describe('toCoreGrinder', () => {
  it('берёт числа из своей записи, а доверие — из каталога', () => {
    const g = toCoreGrinder(c40);
    expect(g.calibration).toEqual({ kind: 'linear', micronsPerStep: 30, zeroOffsetMicrons: 0 });
    expect(g.confidence).toBe('manufacturer');
    expect(g.brand).toBe('Comandante');
  });

  it('запись пользователя, правленная руками, побеждает каталог', () => {
    const edited: GrinderRecord = { ...c40, micronsPerStep: 99 };
    expect(convertGrind(edited, 20, own).microns).toBe(1980);
  });

  it('молке вне каталога назначает доверие «оценка»', () => {
    expect(toCoreGrinder(own).confidence).toBe('estimated');
    expect(toCoreGrinder(own).model).toBe('Своя');
  });
});

describe('convertGrind — обёртка над @coffee/core', () => {
  it('даёт микроны, центр и диапазон целевой шкалы', () => {
    expect(convertGrind(c40, 20, s3)).toEqual({
      microns: 600,
      center: 3.1,
      lo: 2.2,
      hi: 4,
      resolutionMicrons: 8.7,
      clamped: false,
    });
  });

  it('калибровка двигает центр и границы, но не микроны', () => {
    const raw = convertGrind(c40, 20, s3);
    const calibrated = convertGrind(c40, 20, s3, 0.3);
    expect(calibrated.microns).toBe(raw.microns);
    expect(calibrated.resolutionMicrons).toBe(raw.resolutionMicrons);
    expect(calibrated.center).toBeCloseTo(raw.center + 0.3, 10);
    expect(calibrated.lo).toBeCloseTo(raw.lo + 0.3, 10);
    expect(calibrated.hi).toBeCloseTo(raw.hi + 0.3, 10);
  });

  it('отрицательная калибровка зажимается нулём', () => {
    expect(convertGrind(c40, 20, s3, -9)).toMatchObject({ microns: 600, lo: 0, center: 0, hi: 0 });
  });

  it('диапазон всегда охватывает центр', () => {
    for (const setting of [0, 5, 20, 40, 60]) {
      const r = convertGrind(c40, setting, s3);
      expect(r.lo).toBeLessThanOrEqual(r.center);
      expect(r.center).toBeLessThanOrEqual(r.hi);
    }
  });

  it('пересчёт на саму себя возвращает исходную настройку', () => {
    expect(convertGrind(own, 10, own).center).toBe(10);
  });

  it('сообщает, что ответ вышел за пределы шкалы', () => {
    expect(convertGrind(c40, 60, s3).clamped).toBe(true);
  });
});
