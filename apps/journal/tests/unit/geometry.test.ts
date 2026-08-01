import { describe, expect, it } from 'vitest';

import { arcPath } from '../../src/domain/geometry.js';

describe('arcPath', () => {
  it('золотая строка: первый сектор колеса вкусов (cx 175, r 74…170, зазор 0.016)', () => {
    const gap = 0.016;
    const n = 9;
    const a0 = -Math.PI / 2 + gap;
    const a1 = -Math.PI / 2 + (2 * Math.PI) / n - gap;
    expect(arcPath(175, 175, 74, 170, a0, a1)).toBe(
      'M 177.71988394815216 5.021759535790636 A 170 170 0 0 1 282.1763549023025 43.04080573959348 L 221.65323683982578 117.55893896899951 A 74 74 0 0 0 176.18394948331328 101.00947179793239 Z',
    );
  });

  it('четверть кольца: внешняя дуга по часовой, внутренняя обратно', () => {
    expect(arcPath(0, 0, 1, 2, 0, Math.PI / 2)).toBe(
      'M 2 0 A 2 2 0 0 1 1.2246467991473532e-16 2 L 6.123233995736766e-17 1 A 1 1 0 0 0 1 0 Z',
    );
  });

  it('сектор шире полукруга поднимает флаг большой дуги', () => {
    expect(arcPath(10, 10, 4, 8, 0, Math.PI * 1.5)).toBe(
      'M 18 10 A 8 8 0 1 1 9.999999999999998 2 L 10 6 A 4 4 0 1 0 14 10 Z',
    );
  });

  it('ровно полукруг флаг не поднимает', () => {
    expect(arcPath(0, 0, 1, 2, 0, Math.PI)).toContain('A 2 2 0 0 1');
  });

  it('замыкает путь и рисует обе дуги', () => {
    const d = arcPath(40, 40, 15, 38, 0, 0.6);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    expect(d.match(/ A /g)).toHaveLength(2);
  });
});
