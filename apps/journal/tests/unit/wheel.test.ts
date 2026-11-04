import { describe, expect, it } from 'vitest';

import {
  DESC,
  WHEEL,
  type WheelCategory,
  buildDesc,
  catColor,
  colOf,
  descById,
  hueOf,
  lightnessFor,
} from '../../src/data/wheel.js';

// `WHEEL` типизирован литералами (из них выведены union'ы id), поэтому для
// обхода дерева его удобнее рассматривать как обычный массив категорий.
const wheel: readonly WheelCategory[] = WHEEL;
const subs = wheel.flatMap((c) => c.sub);
const leaves = wheel.flatMap((c) => c.sub.flatMap((s) => s.d));

describe('WHEEL — реестр колеса вкусов', () => {
  it('содержит 9 категорий, 28 подкатегорий и 109 дескрипторов', () => {
    expect(wheel).toHaveLength(9);
    expect(subs).toHaveLength(28);
    expect(leaves).toHaveLength(109);
  });

  it('не содержит дублей id ни на одном уровне', () => {
    expect(new Set(wheel.map((c) => c.id)).size).toBe(9);
    expect(new Set(subs.map((s) => s.id)).size).toBe(28);
    expect(new Set(leaves.map((d) => d[0])).size).toBe(109);
  });

  it('хранит квирки прототипа — id append-only контракт', () => {
    const ids = new Set<string>(leaves.map((d) => d[0]));
    for (const id of ['scherry', 'dapricot', 'cocoad']) expect(ids.has(id)).toBe(true);
  });

  it('переезд whisky из wine в spirits сохранил id и категорию', () => {
    // Записи журнала хранят голые id, а цвет категорийный — значит переезд
    // внутри ferment для истории невидим.
    expect(DESC.whisky).toMatchObject({ cat: 'ferment', sub: 'spirits' });
    expect(hueOf('whisky')).toEqual({ h: 310, c: 0.12 });
  });

  it('крепкое и вино пополнены новыми дескрипторами', () => {
    for (const id of ['brandy', 'cognac', 'rum', 'liqueur', 'portwine', 'vermouth', 'champagne'])
      expect(descById(id), id).toMatchObject({ cat: 'ferment' });
  });

  it('у каждой категории есть тон и цветность, а у листьев своих нет', () => {
    for (const c of wheel) {
      expect(c.h).toBeGreaterThanOrEqual(0);
      expect(c.h).toBeLessThanOrEqual(360);
      expect(c.c).toBeGreaterThan(0);
      for (const s of c.sub) {
        expect(s.d.length).toBeGreaterThan(0);
        for (const d of s.d) expect(d).toHaveLength(3);
      }
    }
  });
});

describe('DESC — плоский индекс', () => {
  it('покрывает ровно 109 дескрипторов', () => {
    expect(Object.keys(DESC)).toHaveLength(109);
  });

  it('несёт обратные ссылки на категорию и подкатегорию и её цвет', () => {
    expect(DESC.blackcurrant).toEqual({
      ru: 'чёрная смородина',
      en: 'blackcurrant',
      cat: 'fruit',
      sub: 'berry',
      h: 20,
      c: 0.16,
    });
    for (const c of wheel)
      for (const s of c.sub)
        for (const [id] of s.d) {
          const d = descById(id);
          expect(d).toBeDefined();
          expect(d?.cat).toBe(c.id);
          expect(d?.sub).toBe(s.id);
          expect(d?.h).toBe(c.h);
          expect(d?.c).toBe(c.c);
        }
  });

  it('заморожен — рантайм его не мутирует', () => {
    expect(Object.isFrozen(DESC)).toBe(true);
    expect(() => {
      (DESC as unknown as Record<string, unknown>)['новый'] = 1;
    }).toThrow();
    expect(descById('новый')).toBeUndefined();
  });

  it('строится чистой функцией — повторный вызов даёт тот же результат', () => {
    const again = buildDesc(WHEEL);
    expect(again).not.toBe(DESC);
    expect(again).toEqual(DESC);
  });

  it('на неизвестный id отвечает undefined, а не бросает', () => {
    expect(descById('нет-такого')).toBeUndefined();
  });
});

describe('цвета', () => {
  it('catColor собирает oklch и дописывает альфу только когда она < 1', () => {
    const fruit = wheel[0]!;
    expect(catColor(fruit)).toBe('oklch(0.7 0.160 20)');
    expect(catColor(fruit, 0.66, 0.92, 0.5)).toBe('oklch(0.66 0.147 20 / 0.5)');
  });

  it('hueOf работает на всех трёх уровнях и на неизвестном id', () => {
    expect(hueOf('blackcurrant')).toEqual({ h: 20, c: 0.16 });
    expect(hueOf('fruit')).toEqual({ h: 20, c: 0.16 });
    expect(hueOf('citrus')).toEqual({ h: 20, c: 0.16 });
    expect(hueOf('нет-такого')).toEqual({ h: 0, c: 0 });
  });

  it('colOf держит светлоту 0.72 и глушит цветность ×0.92', () => {
    expect(colOf('blackcurrant')).toBe('oklch(0.72 0.147 20)');
    expect(colOf('blackcurrant', 0.8)).toBe('oklch(0.72 0.147 20 / 0.8)');
  });

  it('lightnessFor различает уровни', () => {
    expect(lightnessFor(0, 0, 9)).toBe(0.66);
    expect(lightnessFor(0, 1, 9)).toBe(0.72);
    expect(lightnessFor(1, 0, 6)).toBe(0.6);
    expect(lightnessFor(1, 5, 6)).toBeCloseTo(0.82, 10);
    expect(lightnessFor(2, 6, 7)).toBeCloseTo(0.84, 10);
    // Единственный элемент уровня не делится на ноль.
    expect(lightnessFor(2, 0, 1)).toBe(0.6);
  });
});
