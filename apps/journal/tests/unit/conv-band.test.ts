import { describe, expect, it } from 'vitest';

import { MIN_WINDOW, bandGeometry } from '../../src/ui/screens/conv/band.js';

describe('bandGeometry — полоса-шкала конвертера', () => {
  it('окно — 1.4 от верхней границы, округлённое вверх', () => {
    expect(bandGeometry({ lo: 10, center: 12, hi: 15 }).win).toBe(21);
  });

  it('окно не меньше восьми даже у мелкого ответа', () => {
    expect(bandGeometry({ lo: 0.4, center: 0.5, hi: 0.6 }).win).toBe(MIN_WINDOW);
  });

  it('заливка стоит на своих процентах', () => {
    /* Ответ 3.2—6.0 с макета: win = ceil(6 * 1.4) = 9. */
    const g = bandGeometry({ lo: 3.2, center: 4.6, hi: 6 });
    expect(g.win).toBe(9);
    expect(g.left).toBeCloseTo(35.6, 1);
    expect(g.width).toBeCloseTo(31.1, 1);
    expect(g.center).toBeCloseTo(51.1, 1);
  });

  it('засечка центра всегда внутри заливки', () => {
    const g = bandGeometry({ lo: 3.2, center: 4.6, hi: 6 });
    expect(g.center).toBeGreaterThanOrEqual(g.left);
    expect(g.center).toBeLessThanOrEqual(g.left + g.width);
  });

  it('верхняя граница садится ровно на правый край окна, когда окно упёрлось в минимум', () => {
    const g = bandGeometry({ lo: 0, center: 4, hi: 8 });
    expect(g.win).toBe(12);
    expect(g.left).toBe(0);
    expect(g.width).toBeCloseTo(66.7, 1);
  });

  it('нулевой ответ не даёт ни отрицательной ширины, ни NaN', () => {
    const g = bandGeometry({ lo: 0, center: 0, hi: 0 });
    expect(g).toEqual({ win: MIN_WINDOW, left: 0, width: 0, center: 0 });
  });

  it('проценты зажаты сотней — калибровка может увезти ответ за окно', () => {
    /* hi считается от окна, но lo и center сдвигаются калибровкой независимо. */
    const g = bandGeometry({ lo: 0, center: 40, hi: 1 });
    expect(g.center).toBe(100);
    expect(g.width).toBeLessThanOrEqual(100);
  });
});
