import { describe, expect, it } from 'vitest';

import { WHEEL } from '../../src/data/wheel.js';
import type { Descriptor, EntryRecord } from '../../src/db/schema.js';
import {
  CX,
  CY,
  GAP,
  HUB_R,
  LABEL_R,
  MEM_R,
  R0,
  R1,
  SIZE,
  VIEW_BOX,
  type WheelItem,
  addHereTarget,
  crumbs,
  fillOf,
  labelFontSize,
  labelRotation,
  memoryHit,
  memorySet,
  pathInto,
  pathUp,
  polar,
  sectorAngles,
  wheelItems,
} from '../../src/ui/screens/wheel/wheel-view.js';

/* ── Фикстуры ────────────────────────────────────────────────────────────── */

/** Запись журнала: важны только `status` и `desc`, остальное — заполнение. */
function entry(id: string, status: EntryRecord['status'], desc: Descriptor[]): EntryRecord {
  return {
    id,
    date: '2026-07-30',
    time: '09:05',
    bean: null,
    device: null,
    devName: '',
    mode: 'cup',
    grind: null,
    dose: 0,
    water: 0,
    temp: 0,
    total: 0,
    stages: [],
    status,
    diag: { acid: 5, bitter: 5, body: 5, balance: 5 },
    desc,
    note: '',
  };
}

const item = (id: string, leaf: boolean): WheelItem => ({ id, label: id, h: 0, c: 0, l: 0.7, leaf });

/* ── Уровни ──────────────────────────────────────────────────────────────── */

describe('wheelItems — уровни колеса', () => {
  it('корень — девять категорий, светлота через одну', () => {
    const items = wheelItems([], 'ru');
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.id)).toEqual(WHEEL.map((c) => c.id));
    expect(items.every((i) => !i.leaf)).toBe(true);

    // i % 2 ? 0.72 : 0.66 — чередование, чтобы соседние сектора различались.
    expect(items.map((i) => i.l)).toEqual([0.66, 0.72, 0.66, 0.72, 0.66, 0.72, 0.66, 0.72, 0.66]);
    expect(items[0]?.label).toBe('Фруктовое');
    expect(wheelItems([], 'en')[0]?.label).toBe('Fruity');
  });

  it('уровень категории — её подкатегории, светлота 0.6 + i·0.22/(n−1)', () => {
    const items = wheelItems(['fruit'], 'ru');
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.id)).toEqual(['berry', 'citrus', 'stone', 'tropic', 'orchard', 'dried']);
    expect(items.every((i) => !i.leaf)).toBe(true);

    expect(items[0]?.l).toBeCloseTo(0.6, 10);
    expect(items[1]?.l).toBeCloseTo(0.6 + 0.22 / 5, 10);
    expect(items[5]?.l).toBeCloseTo(0.82, 10);
  });

  it('уровень подкатегории — листья, светлота 0.6 + i·0.24/(n−1)', () => {
    const items = wheelItems(['fruit', 'berry'], 'ru');
    expect(items).toHaveLength(7);
    expect(items[0]?.id).toBe('strawberry');
    expect(items.every((i) => i.leaf)).toBe(true);

    expect(items[0]?.l).toBeCloseTo(0.6, 10);
    expect(items[6]?.l).toBeCloseTo(0.84, 10);
    expect(items[6]?.label).toBe('Чёрная смородина');
  });

  it('тон и цветность на всех уровнях — категорийные', () => {
    for (const path of [['fruit'], ['fruit', 'berry']])
      for (const i of wheelItems(path, 'ru')) {
        expect(i.h).toBe(20);
        expect(i.c).toBe(0.16);
      }
  });

  it('единственный элемент уровня не делит на ноль', () => {
    // Самая короткая подкатегория колеса — «Острые», два дескриптора.
    const items = wheelItems(['spice', 'pungent'], 'ru');
    expect(items).toHaveLength(2);
    expect(items[0]?.l).toBeCloseTo(0.6, 10);
    expect(items[1]?.l).toBeCloseTo(0.84, 10);
  });

  it('неизвестный id в пути откатывает на уровень выше, а не роняет экран', () => {
    expect(wheelItems(['нет-такой'], 'ru')).toHaveLength(9);
    expect(wheelItems(['fruit', 'нет-такой'], 'ru').map((i) => i.id)).toEqual(
      wheelItems(['fruit'], 'ru').map((i) => i.id),
    );
  });

  it('fillOf печатает oklch со светлотой в три знака', () => {
    const first = wheelItems([], 'ru')[0];
    expect(first).toBeDefined();
    expect(fillOf(first as WheelItem)).toBe('oklch(0.660 0.16 20)');
  });
});

/* ── Навигация ───────────────────────────────────────────────────────────── */

describe('путь', () => {
  it('тап по нелистовому уходит глубже, по листу — не трогает путь', () => {
    expect(pathInto([], item('fruit', false))).toEqual(['fruit']);
    expect(pathInto(['fruit'], item('berry', false))).toEqual(['fruit', 'berry']);
    expect(pathInto(['fruit', 'berry'], item('blueberry', true))).toEqual(['fruit', 'berry']);
  });

  it('наверх снимает последний уровень, на корне остаётся корень', () => {
    expect(pathUp(['fruit', 'berry'])).toEqual(['fruit']);
    expect(pathUp(['fruit'])).toEqual([]);
    expect(pathUp([])).toEqual([]);
  });
});

describe('crumbs', () => {
  it('на корне — одна крошка «ВСЁ», и она текущая', () => {
    expect(crumbs([], 'ru')).toEqual([{ key: 'root', label: 'ВСЁ', current: true, depth: 0 }]);
    expect(crumbs([], 'en')[0]?.label).toBe('ALL');
  });

  it('глубже — цепочка имён, текущая только последняя', () => {
    const trail = crumbs(['fruit', 'berry'], 'ru');
    expect(trail.map((c) => c.label)).toEqual(['ВСЁ', 'Фруктовое', 'Ягоды']);
    expect(trail.map((c) => c.current)).toEqual([false, false, true]);
    // depth — во сколько элементов обрезать путь при тапе.
    expect(trail.map((c) => c.depth)).toEqual([0, 1, 2]);
  });
});

describe('addHereTarget — «+ <имя>»', () => {
  it('на корне добавлять нечего', () => {
    expect(addHereTarget([], [])).toBeNull();
  });

  it('предлагает текущий уровень — и категорию, и подкатегорию', () => {
    expect(addHereTarget(['fruit'], [])).toBe('fruit');
    expect(addHereTarget(['fruit', 'berry'], [])).toBe('berry');
  });

  it('молчит, когда этот уровень уже выбран', () => {
    const picked: Descriptor[] = [['fruit', 2]];
    expect(addHereTarget(['fruit'], picked)).toBeNull();
    expect(addHereTarget(['fruit', 'berry'], picked)).toBe('berry');
  });
});

/* ── Память ──────────────────────────────────────────────────────────────── */

describe('memorySet', () => {
  it('объединяет дескрипторы только оценённых записей', () => {
    const mem = memorySet([
      entry('j1', 'done', [
        ['blueberry', 2],
        ['honey', 1],
      ]),
      entry('j2', 'pending', [['caramel', 3]]),
      entry('j3', 'done', [['blueberry', 3]]),
    ]);
    expect([...mem].sort()).toEqual(['blueberry', 'honey']);
  });

  it('пустой журнал даёт пустое множество', () => {
    expect(memorySet([]).size).toBe(0);
    expect(memorySet([entry('j1', 'done', [])]).size).toBe(0);
  });
});

describe('memoryHit — вложенность через DESC.cat/sub', () => {
  const mem = memorySet([entry('j1', 'done', [['blueberry', 2]])]);

  it('лист отмечается только сам собой', () => {
    expect(memoryHit(mem, item('blueberry', true))).toBe(true);
    expect(memoryHit(mem, item('raspberry', true))).toBe(false);
  });

  it('категория и подкатегория отмечаются «внутри есть хоть один»', () => {
    expect(memoryHit(mem, item('fruit', false))).toBe(true);
    expect(memoryHit(mem, item('berry', false))).toBe(true);
    expect(memoryHit(mem, item('citrus', false))).toBe(false);
    expect(memoryHit(mem, item('sweet', false))).toBe(false);
  });

  it('нелистовой id, выбранный кнопкой «+ <имя>», отмечает сам себя', () => {
    const own = memorySet([entry('j1', 'done', [['fruit', 2]])]);
    expect(memoryHit(own, item('fruit', false))).toBe(true);
    // Но внутрь такой выбор не протекает: конкретных листьев за ним нет.
    expect(memoryHit(own, item('berry', false))).toBe(false);
    expect(memoryHit(own, item('blueberry', true))).toBe(false);
  });

  it('пустая память не отмечает ничего', () => {
    const none = new Set<string>();
    expect(memoryHit(none, item('fruit', false))).toBe(false);
    expect(memoryHit(none, item('blueberry', true))).toBe(false);
  });

  it('не спотыкается о дескриптор, которого больше нет в реестре', () => {
    const stale = memorySet([entry('j1', 'done', [['снятый-с-производства', 2]])]);
    expect(memoryHit(stale, item('fruit', false))).toBe(false);
    expect(memoryHit(stale, item('снятый-с-производства', true))).toBe(true);
  });
});

/* ── Геометрия ───────────────────────────────────────────────────────────── */

describe('геометрия колеса', () => {
  it('держит числа прототипа', () => {
    expect([CX, CY, R0, R1]).toEqual([175, 175, 74, 170]);
    expect(GAP).toBe(0.016);
    expect(HUB_R).toBe(65);
    expect(LABEL_R).toBe(124);
    expect(MEM_R).toBe(161);
    expect(VIEW_BOX).toBe('0 0 350 350');
    expect(SIZE).toBe(322);
  });

  it('первый сектор начинается с двенадцати часов и идёт по часовой', () => {
    const { a0, a1, am } = sectorAngles(0, 9);
    expect(a0).toBeCloseTo(-Math.PI / 2 + 0.016, 10);
    expect(a1).toBeCloseTo(-Math.PI / 2 + (2 * Math.PI) / 9 - 0.016, 10);
    expect(am).toBeCloseTo((a0 + a1) / 2, 10);

    // Середина первого сектора из девяти — чуть правее верхней точки.
    const p = polar(R1, am);
    expect(p.x).toBeGreaterThan(CX);
    expect(p.y).toBeLessThan(CY);
  });

  it('сектора не перекрываются и покрывают круг', () => {
    const n = 6;
    for (let i = 0; i < n - 1; i++) {
      const cur = sectorAngles(i, n);
      const next = sectorAngles(i + 1, n);
      expect(next.a0 - cur.a1).toBeCloseTo(2 * GAP, 10);
    }
    expect(sectorAngles(n - 1, n).a1 + GAP - (sectorAngles(0, n).a0 - GAP)).toBeCloseTo(
      2 * Math.PI,
      10,
    );
  });

  it('кегль подписи падает с числом секторов', () => {
    expect(labelFontSize(5)).toBe(10);
    expect(labelFontSize(6)).toBe(10);
    expect(labelFontSize(7)).toBe(9);
    expect(labelFontSize(10)).toBe(9);
    expect(labelFontSize(11)).toBe(8);
  });

  it('подпись в левой половине доворачивается на 180°', () => {
    // Три часа — поворота нет; девять часов — есть, иначе текст вверх ногами.
    expect(labelRotation(0)).toBeCloseTo(0, 10);
    expect(labelRotation(Math.PI)).toBeCloseTo(360, 10);
    expect(labelRotation(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(labelRotation((3 * Math.PI) / 4)).toBeCloseTo(315, 10);
  });

  it('polar считает от центра колеса', () => {
    expect(polar(0, 0)).toEqual({ x: CX, y: CY });
    const right = polar(R1, 0);
    expect(right.x).toBeCloseTo(CX + R1, 10);
    expect(right.y).toBeCloseTo(CY, 10);
  });
});
