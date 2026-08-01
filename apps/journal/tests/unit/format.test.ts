import { describe, expect, it } from 'vitest';

import { fmtT } from '../../src/domain/format.js';

describe('fmtT', () => {
  it('форматирует M:SS с ведущим нулём в секундах', () => {
    expect(fmtT(0)).toBe('0:00');
    expect(fmtT(5)).toBe('0:05');
    expect(fmtT(65)).toBe('1:05');
    expect(fmtT(600)).toBe('10:00');
  });

  it('минуты и секунды считаются от одного округлённого значения (D-3)', () => {
    // В прототипе здесь было "1:00": минуты брались от неокруглённых секунд.
    expect(fmtT(119.6)).toBe('2:00');
    expect(fmtT(59.6)).toBe('1:00');
    expect(fmtT(59.4)).toBe('0:59');
    expect(fmtT(119.4)).toBe('1:59');
  });

  it('держит границы минут и часов', () => {
    expect(fmtT(120)).toBe('2:00');
    expect(fmtT(3599)).toBe('59:59');
    expect(fmtT(3600)).toBe('60:00');
  });

  it('сохраняет знак отклонения', () => {
    expect(fmtT(-5.4)).toBe('-0:05');
    expect(fmtT(-65)).toBe('-1:05');
  });

  it('не падает на нечисловом входе', () => {
    expect(fmtT(Number.NaN)).toBe('0:00');
    expect(fmtT(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});
