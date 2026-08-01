import { describe, expect, it } from 'vitest';

import type { DeviceRecord, Stage } from '../../src/db/schema.js';
import {
  type BrewPlan,
  STAGE_KEYS,
  plannedTotal,
  plannedWater,
  stagesFor,
} from '../../src/domain/stages.js';

const device = (flow: DeviceRecord['flow'], bottom: DeviceRecord['bottom']): DeviceRecord => ({
  id: 'd1',
  name: 'Девайс',
  flow,
  bottom,
  wall: 'smooth',
  filter: 'pcone',
  material: 'glass',
  vol: 'm',
});

const base: BrewPlan = {
  form: 'beans',
  device: null,
  hyMode: 'perc',
  dose: 15,
  water: 250,
  pours: 2,
  valveAt: 80,
};

interface Row {
  name: string;
  plan: BrewPlan;
  expected: Stage[];
}

const rows: Row[] = [
  {
    name: 'drip · 180 г / 3 пролива — вода делится нацело',
    plan: { ...base, form: 'drip', water: 180, pours: 3 },
    expected: [
      ['pour', 30, 60],
      ['steep', 30, 0],
      ['pour', 30, 60],
      ['steep', 30, 0],
      ['pour', 30, 60],
      ['drain', 30, 0],
    ],
  },
  {
    name: 'drip · 200 г / 3 пролива — остаток уходит в последний пролив (D-2)',
    plan: { ...base, form: 'drip', water: 200, pours: 3 },
    expected: [
      ['pour', 30, 65],
      ['steep', 30, 0],
      ['pour', 30, 65],
      ['steep', 30, 0],
      ['pour', 30, 70],
      ['drain', 30, 0],
    ],
  },
  {
    name: 'drip · один пролив — настаиваний нет',
    plan: { ...base, form: 'drip', water: 200, pours: 1 },
    expected: [
      ['pour', 30, 200],
      ['drain', 30, 0],
    ],
  },
  {
    name: 'drip · шесть проливов',
    plan: { ...base, form: 'drip', water: 250, pours: 6 },
    expected: [
      ['pour', 30, 40],
      ['steep', 30, 0],
      ['pour', 30, 40],
      ['steep', 30, 0],
      ['pour', 30, 40],
      ['steep', 30, 0],
      ['pour', 30, 40],
      ['steep', 30, 0],
      ['pour', 30, 40],
      ['steep', 30, 0],
      ['pour', 30, 50],
      ['drain', 30, 0],
    ],
  },
  {
    name: 'perc · девайс не выбран — фолбэк на перколяцию',
    plan: base,
    expected: [
      ['bloom', 45, 45],
      ['pour', 40, 105],
      ['pour', 40, 100],
      ['drain', 50, 0],
    ],
  },
  {
    name: 'perc · три пролива',
    plan: { ...base, pours: 3, device: device('perc', 'cone') },
    expected: [
      ['bloom', 45, 45],
      ['pour', 40, 70],
      ['pour', 40, 70],
      ['pour', 40, 65],
      ['drain', 50, 0],
    ],
  },
  {
    name: 'perc · доза 18 г, один пролив',
    plan: { ...base, dose: 18, water: 300, pours: 1, device: device('perc', 'flat') },
    expected: [
      ['bloom', 45, 55],
      ['pour', 40, 245],
      ['drain', 50, 0],
    ],
  },
  {
    name: 'hy-perc · гибрид с закрытым клапаном идёт по перколяции',
    plan: { ...base, device: device('hybrid', 'cone'), hyMode: 'perc' },
    expected: [
      ['bloom', 45, 45],
      ['pour', 40, 105],
      ['pour', 40, 100],
      ['drain', 50, 0],
    ],
  },
  {
    name: 'imm · цилиндр даёт продавливание',
    plan: { ...base, water: 210, device: device('imm', 'cyl') },
    expected: [
      ['steep', 120, 210],
      ['stir', 0, 0],
      ['press', 30, 0],
    ],
  },
  {
    name: 'imm · конус даёт дренаж',
    plan: { ...base, water: 210, device: device('imm', 'cone') },
    expected: [
      ['steep', 120, 210],
      ['stir', 0, 0],
      ['drain', 30, 0],
    ],
  },
  {
    name: 'hy-imm · клапан открывают после настаивания',
    plan: { ...base, water: 240, device: device('hybrid', 'cone'), hyMode: 'imm' },
    expected: [
      ['steep', 150, 240],
      ['valve', 0, 0],
      ['drain', 60, 0],
    ],
  },
  {
    name: 'hy-mid · длительность настаивания = момент открытия клапана',
    plan: { ...base, water: 240, valveAt: 80, device: device('hybrid', 'cone'), hyMode: 'mid' },
    expected: [
      ['steep', 80, 240],
      ['valve', 0, 0],
      ['drain', 90, 0],
    ],
  },
];

describe('ключи стадий — контракт', () => {
  it('ровно восемь: bloom|pour|drain|steep|stir|press|valve|pause', () => {
    expect(STAGE_KEYS).toEqual(['bloom', 'pour', 'drain', 'steep', 'stir', 'press', 'valve', 'pause']);
    expect(new Set(STAGE_KEYS).size).toBe(8);
  });
});

describe('stagesFor — пять веток', () => {
  for (const row of rows) {
    it(row.name, () => {
      expect(stagesFor(row.plan)).toEqual(row.expected);
    });
  }

  it('вода сходится с заданной во всех ветках (drip — по D-2)', () => {
    for (const row of rows) {
      expect(plannedWater(stagesFor(row.plan)), row.name).toBe(row.plan.water);
    }
  });

  it('использует только объявленные ключи стадий и не порождает pause', () => {
    for (const row of rows)
      for (const [key] of stagesFor(row.plan)) {
        expect(STAGE_KEYS).toContain(key);
        expect(key).not.toBe('pause');
      }
  });

  it('форма пачки важнее девайса: дрип не смотрит на поток', () => {
    const withDevice = stagesFor({ ...base, form: 'drip', water: 180, pours: 3, device: device('imm', 'cyl') });
    const withoutDevice = stagesFor({ ...base, form: 'drip', water: 180, pours: 3 });
    expect(withDevice).toEqual(withoutDevice);
  });

  it('молотый кофе идёт по тем же веткам, что и зерно', () => {
    expect(stagesFor({ ...base, form: 'ground' })).toEqual(stagesFor(base));
  });

  it('нулевые проливы не ломают арифметику — минимум один', () => {
    expect(stagesFor({ ...base, form: 'drip', water: 100, pours: 0 })).toEqual([
      ['pour', 30, 100],
      ['drain', 30, 0],
    ]);
    expect(plannedWater(stagesFor({ ...base, pours: 0 }))).toBe(250);
  });

  it('plannedTotal складывает целевые длительности, маркеры дают ноль', () => {
    expect(plannedTotal(stagesFor(base))).toBe(45 + 40 + 40 + 50);
    expect(plannedTotal(stagesFor({ ...base, water: 210, device: device('imm', 'cyl') }))).toBe(150);
  });
});
