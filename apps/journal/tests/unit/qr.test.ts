/**
 * QR рецепта — контракт №3 (BJ-6).
 *
 * Три обещания контракта и проверяются: форма payload, отсутствие внутренних
 * id, бюджет в 500 байт. Плюс то, ради чего всё затевалось: строка должна
 * кодироваться настоящим QR — матрицей нечётного размера с тремя маркерами
 * позиционирования по углам. Без этой проверки тест сошёлся бы и на шуме,
 * который BJ-4 отсюда и выкинул (D-12).
 */

import { describe, expect, it } from 'vitest';
import { encode } from 'uqr';

import type { BeanRecord, DeviceRecord, EntryRecord } from '../../src/db/schema.js';
import {
  QR_BUDGET,
  byteLength,
  encodeRecipe,
  hasRecipe,
  modulesPath,
  plannedStages,
  recipePayload,
  recipeText,
} from '../../src/ui/screens/journal/qr.js';

const BEAN: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-20',
  photos: [],
  weight: 250,
  left: 235,
};

const DEVICE: DeviceRecord = {
  id: 'v60',
  name: 'V60',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'ceramic',
  vol: 'm',
};

const ENTRY: EntryRecord = {
  id: 'j1',
  date: '2026-07-30',
  time: '09:12',
  bean: 'java',
  device: 'v60',
  devName: 'V60',
  mode: 'perc',
  grind: 4.6,
  dose: 15,
  water: 250,
  temp: 94,
  total: 195,
  stages: [
    ['bloom', 45, 45],
    ['pour', 38, 205],
    ['pause', 12, 0],
    ['drain', 50, 0],
  ],
  pours: 3,
  status: 'done',
  diag: { acid: 7, bitter: 3, body: 5, balance: 8 },
  desc: [['berry', 2]],
  note: 'сладко, кислотность держит',
};

describe('payload рецепта', () => {
  it('содержит поля контракта и не содержит внутренних id', () => {
    const payload = recipePayload(ENTRY, BEAN, DEVICE);

    expect(payload.v).toBe(1);
    expect(payload.t).toBe('recipe');
    expect(payload.mode).toBe('perc');
    expect(payload.grind).toBe(4.6);
    expect(payload.dose).toBe(15);
    expect(payload.water).toBe(250);
    expect(payload.temp).toBe(94);
    expect(payload.pours).toBe(3);

    // Пачка — именем: рецепт читают на чужом устройстве, где id ничего не значит.
    expect(payload.bean).toBe('Ява Золотая');
    const text = JSON.stringify(payload);
    expect(text).not.toContain('java');
    expect(text).not.toContain('j1');
    expect(text).not.toContain('v60');
  });

  it('клапан попадает в payload только у гибрида «СЕРЕДИНА»', () => {
    expect(recipePayload(ENTRY, BEAN, DEVICE).valveAt).toBeUndefined();

    // Проливов у гибрида схема не пишет — поле выбрасывается, а не обнуляется.
    const { pours: _pours, ...rest } = ENTRY;
    const hybrid: EntryRecord = { ...rest, mode: 'hybrid', valveAt: 80 };
    expect(recipePayload(hybrid, BEAN, { ...DEVICE, flow: 'hybrid' }).valveAt).toBe(80);
  });

  it('помол не выдумывается там, где его задал производитель', () => {
    const ground: EntryRecord = { ...ENTRY, grind: null };
    expect(recipePayload(ground, { ...BEAN, form: 'ground' }, DEVICE).grind).toBeNull();
  });

  it('стадии плановые, а не записанные: пауза заваривания в рецепт не уезжает', () => {
    const payload = recipePayload(ENTRY, BEAN, DEVICE);
    expect(payload.stages).toBeDefined();
    expect(payload.stages?.map(([key]) => key)).not.toContain('pause');

    // Плановая вода сходится с заданной — генератор стадий, а не копия записи.
    const water = payload.stages?.reduce((sum, [, , g]) => sum + g, 0);
    expect(water).toBe(250);
  });

  it('без пачки стадий нет: форму кофе восстановить не из чего', () => {
    expect(plannedStages(ENTRY, null, DEVICE)).toBeUndefined();
    expect(recipePayload(ENTRY, null, DEVICE).stages).toBeUndefined();
  });
});

describe('бюджет строки', () => {
  it('обычный рецепт влезает в 500 байт вместе со стадиями', () => {
    const text = recipeText(ENTRY, BEAN, DEVICE);
    expect(byteLength(text)).toBeLessThanOrEqual(QR_BUDGET);
    expect(JSON.parse(text)).toHaveProperty('stages');
  });

  it('не влезающий рецепт теряет стадии, но остаётся рецептом', () => {
    // Шесть проливов дают вдвое больше стадий, а длинное имя добивает остаток.
    const long: EntryRecord = { ...ENTRY, pours: 6, water: 900 };
    const bean: BeanRecord = { ...BEAN, name: 'Эфиопия Иргачеффе Конга '.repeat(8) };

    const payload = recipePayload(long, bean, DEVICE);
    expect(byteLength(JSON.stringify(payload))).toBeGreaterThan(QR_BUDGET);

    const text = encodeRecipe(payload);
    const decoded = JSON.parse(text) as Record<string, unknown>;
    expect(decoded).not.toHaveProperty('stages');
    // Остальное на месте: без стадий рецепт ещё рецепт, без дозы — уже нет.
    expect(decoded.dose).toBe(15);
    expect(decoded.water).toBe(900);
    expect(decoded.temp).toBe(94);
  });
});

describe('кодирование', () => {
  it('строка превращается в настоящую матрицу QR', () => {
    const qr = encode(recipeText(ENTRY, BEAN, DEVICE), { ecc: 'M', border: 2 });

    // Версия N даёт 4N+17 модулей плюс рамка с обеих сторон.
    expect(qr.size).toBe(4 * qr.version + 17 + 4);
    expect(qr.data).toHaveLength(qr.size);

    /* Три маркера позиционирования: чёрный квадрат 7×7 в трёх углах матрицы.
       Проверяются их внешние углы — попасть в них случайным шумом нельзя. */
    const at = (y: number, x: number): boolean | undefined => qr.data[y]?.[x];
    const inner = 2;
    const last = qr.size - 1 - inner;
    expect(at(inner, inner)).toBe(true);
    expect(at(inner, last)).toBe(true);
    expect(at(last, inner)).toBe(true);
    // Четвёртый угол маркера не несёт — там данные, и он белый.
    expect(at(last, last)).toBe(false);
  });

  it('путь рисует по одному замкнутому квадрату на каждый чёрный модуль', () => {
    expect(modulesPath([[true, false], [false, true]])).toBe('M0 0h1v1h-1zM1 1h1v1h-1z');
    expect(modulesPath([[false, false]])).toBe('');

    const qr = encode('BJ', { ecc: 'M', border: 0 });
    const black = qr.data.flat().filter(Boolean).length;
    expect(modulesPath(qr.data).split('M').length - 1).toBe(black);
  });
});

describe('когда QR вообще показывается', () => {
  it('у заваривания — да, у дегустации — нет', () => {
    expect(hasRecipe(ENTRY)).toBe(true);
    expect(hasRecipe({ ...ENTRY, mode: 'cup', water: 0, dose: 0 })).toBe(false);
  });
});
