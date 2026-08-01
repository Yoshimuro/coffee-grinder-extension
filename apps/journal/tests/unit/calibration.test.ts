import { describe, expect, it } from 'vitest';

import type { EntryRecord } from '../../src/db/schema.js';
import {
  applyCalib,
  calibrationFrom,
  computeOffset,
  hasCalibration,
  resetCalibration,
  suggestCalibration,
} from '../../src/domain/calibration.js';

const entry = (id: string, grind: number | null, balance: number, status: 'done' | 'pending' = 'done'): EntryRecord => ({
  id,
  date: '2026-07-30',
  time: '09:05',
  bean: 'java',
  device: null,
  devName: 'V60',
  mode: 'perc',
  grind,
  dose: 15,
  water: 250,
  temp: 94,
  total: 170,
  stages: [],
  status,
  diag: { acid: 5, bitter: 4, body: 5, balance },
  desc: [],
  note: '',
});

describe('applyCalib', () => {
  const span = { lo: 2.2, center: 3.1, hi: 4 };

  it('двигает все три точки диапазона', () => {
    expect(applyCalib(span, 0.3)).toEqual({ lo: 2.5, center: 3.4, hi: 4.3 });
    expect(applyCalib(span, -0.5)).toEqual({ lo: 1.7, center: 2.6, hi: 3.5 });
  });

  it('нулевое смещение только округляет до 0.1', () => {
    expect(applyCalib({ lo: 2.24, center: 3.149, hi: 4.02 }, 0)).toEqual({
      lo: 2.2,
      center: 3.1,
      hi: 4,
    });
  });

  it('не уводит шкалу в минус', () => {
    expect(applyCalib(span, -9)).toEqual({ lo: 0, center: 0, hi: 0 });
  });

  it('сохраняет порядок lo ≤ center ≤ hi', () => {
    for (const offset of [-2, -0.4, 0, 0.7, 3]) {
      const out = applyCalib(span, offset);
      expect(out.lo).toBeLessThanOrEqual(out.center);
      expect(out.center).toBeLessThanOrEqual(out.hi);
    }
  });
});

describe('computeOffset', () => {
  it('это «хорошая настройка» минус сырой центр, до 0.1', () => {
    expect(computeOffset(4.6, 4.3)).toBe(0.3);
    expect(computeOffset(4.0, 4.6)).toBe(-0.6);
    expect(computeOffset(4.64, 4.6)).toBe(0);
  });

  it('round-trip: вычисленное смещение приводит центр к хорошей настройке', () => {
    const raw = { lo: 2.2, center: 3.1, hi: 4 };
    const good = 3.4;
    expect(applyCalib(raw, computeOffset(good, raw.center)).center).toBe(good);
  });
});

describe('suggestCalibration', () => {
  const journal = [
    entry('j3', 4.6, 7),
    entry('j2', 4.8, 6),
    entry('j4', 5.0, 4),
    entry('j9', null, 10),
    entry('j1', 4.4, 9, 'pending'),
  ];

  it('берёт лучшую оценённую запись по сладости', () => {
    expect(suggestCalibration(journal)?.id).toBe('j3');
  });

  it('игнорирует записи без помола и ждущие оценки', () => {
    const ids = journal.filter((j) => j.status === 'done' && j.grind != null).map((j) => j.id);
    expect(ids).not.toContain('j9');
    expect(ids).not.toContain('j1');
  });

  it('не мутирует журнал', () => {
    const before = journal.map((j) => j.id);
    suggestCalibration(journal);
    expect(journal.map((j) => j.id)).toEqual(before);
  });

  it('на пустом журнале даёт undefined', () => {
    expect(suggestCalibration([])).toBeUndefined();
  });
});

describe('calibrationFrom / reset', () => {
  const best = entry('j3', 4.6, 7);

  it('помечает источником запись, если настройка совпала с её помолом', () => {
    expect(calibrationFrom(4.6, 4.3, best)).toEqual({ offset: 0.3, src: 'j3' });
  });

  it('ручной ввод остаётся без источника', () => {
    expect(calibrationFrom(5.2, 4.3, best)).toEqual({ offset: 0.9, src: null });
    expect(calibrationFrom(5.2, 4.3)).toEqual({ offset: 0.9, src: null });
  });

  it('сброс обнуляет смещение и источник', () => {
    expect(resetCalibration()).toEqual({ offset: 0, src: null });
    expect(hasCalibration(resetCalibration())).toBe(false);
    expect(hasCalibration({ offset: -0.2, src: null })).toBe(true);
  });
});
