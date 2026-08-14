import { describe, expect, it } from 'vitest';

import {
  type WheelEdit,
  composeWheel,
  makeWheelSet,
} from '../../src/data/wheel-edits.js';
import {
  BASE_WHEEL,
  WHEEL,
  type WheelCategory,
  hueOf,
  nameOf,
} from '../../src/data/wheel.js';
import { memoryHit, wheelItems } from '../../src/ui/screens/wheel/wheel-view.js';

const wheel: readonly WheelCategory[] = WHEEL;

function leaves(cats: readonly WheelCategory[]): string[] {
  return cats.flatMap((c) => c.sub.flatMap((s) => s.d.map((d) => d[0])));
}

describe('composeWheel — наложение правок на базу', () => {
  it('пустой список правок даёт равное базе дерево, не трогая её саму', () => {
    const out = composeWheel(wheel, []);
    expect(out).not.toBe(wheel);
    expect(out).toEqual(wheel);
  });

  it('база не мутируется ни одной операцией', () => {
    const before = JSON.stringify(wheel);
    composeWheel(wheel, [
      { op: 'add-desc', id: 'u-x', sub: 'spirits', ru: 'Х', en: 'X' },
      { op: 'rename', target: 'whisky', ru: 'Скотч', en: 'Scotch' },
      { op: 'hide', target: 'fruit' },
    ]);
    expect(JSON.stringify(wheel)).toBe(before);
  });

  it('add-desc дописывает лист в конец подкатегории', () => {
    const out = composeWheel(wheel, [
      { op: 'add-desc', id: 'u-amaretto', sub: 'spirits', ru: 'Амаретто', en: 'Amaretto' },
    ]);
    const spirits = out.find((c) => c.id === 'ferment')?.sub.find((s) => s.id === 'spirits');
    expect(spirits?.d.at(-1)).toEqual(['u-amaretto', 'Амаретто', 'Amaretto']);
    expect(leaves(out)).toHaveLength(leaves(wheel).length + 1);
  });

  it('add-sub и add-cat строят новые уровни, порядок правок значим', () => {
    const edits: WheelEdit[] = [
      { op: 'add-cat', id: 'u-dairy', ru: 'Молочное', en: 'Dairy', h: 200, c: 0.06 },
      { op: 'add-sub', id: 'u-cream', cat: 'u-dairy', ru: 'Сливочное', en: 'Creamy' },
      { op: 'add-desc', id: 'u-butter', sub: 'u-cream', ru: 'Масло', en: 'Butter' },
    ];
    const out = composeWheel(wheel, edits);
    const dairy = out.at(-1);
    expect(dairy?.id).toBe('u-dairy');
    expect(dairy?.sub[0]?.d[0]?.[0]).toBe('u-butter');
  });

  it('rename меняет только подписи, id нетронут', () => {
    const out = composeWheel(wheel, [
      { op: 'rename', target: 'whisky', ru: 'Скотч', en: 'Scotch' },
    ]);
    const ws = makeWheelSet(out);
    expect(nameOf('whisky', 'ru', ws)).toBe('Скотч');
    expect(leaves(out)).toContain('whisky');
  });

  it('hide убирает узел с любого из трёх уровней', () => {
    const out = composeWheel(wheel, [
      { op: 'hide', target: 'whisky' },
      { op: 'hide', target: 'acids' },
      { op: 'hide', target: 'other' },
    ]);
    expect(leaves(out)).not.toContain('whisky');
    expect(out.flatMap((c) => c.sub.map((s) => s.id))).not.toContain('acids');
    expect(out.map((c) => c.id)).not.toContain('other');
  });

  it('кривые правки пропускаются молча: занятый id, неизвестная цель', () => {
    const out = composeWheel(wheel, [
      // id занят встроенным дескриптором — вторая «клубника» не появится.
      { op: 'add-desc', id: 'strawberry', sub: 'spirits', ru: 'Дубль', en: 'Dupe' },
      { op: 'add-desc', id: 'u-x', sub: 'нет-такой', ru: 'Х', en: 'X' },
      { op: 'add-sub', id: 'u-s', cat: 'нет-такой', ru: 'Х', en: 'X' },
      { op: 'rename', target: 'нет-такой', ru: 'Х', en: 'X' },
      { op: 'hide', target: 'нет-такой' },
    ]);
    expect(out).toEqual(wheel);
  });
});

describe('makeWheelSet — составной набор в функциях колеса', () => {
  const ws = makeWheelSet(
    composeWheel(wheel, [
      { op: 'add-desc', id: 'u-amaretto', sub: 'spirits', ru: 'Амаретто', en: 'Amaretto' },
      { op: 'hide', target: 'whisky' },
    ]),
  );

  it('пользовательский дескриптор наследует цвет категории и знает имя', () => {
    expect(nameOf('u-amaretto', 'ru', ws)).toBe('Амаретто');
    expect(hueOf('u-amaretto', ws)).toEqual(hueOf('ferment'));
  });

  it('скрытый встроенный узел ушёл из колеса, но имя и цвет помнит база', () => {
    const items = wheelItems(['ferment', 'spirits'], 'ru', ws);
    expect(items.map((i) => i.id)).not.toContain('whisky');
    // Старая запись журнала с whisky не сереет и не превращается в голый id.
    expect(nameOf('whisky', 'ru', ws)).toBe('Виски');
    expect(hueOf('whisky', ws)).toEqual({ h: 310, c: 0.12 });
  });

  it('wheelItems отдаёт пользовательский лист наравне со встроенными', () => {
    const items = wheelItems(['ferment', 'spirits'], 'ru', ws);
    const custom = items.find((i) => i.id === 'u-amaretto');
    expect(custom).toMatchObject({ label: 'Амаретто', leaf: true, h: 310, c: 0.12 });
  });

  it('memoryHit видит пользовательский дескриптор через обратные ссылки', () => {
    const mem = new Set(['u-amaretto']);
    const cat = wheelItems([], 'ru', ws).find((i) => i.id === 'ferment');
    expect(cat).toBeDefined();
    if (cat) expect(memoryHit(mem, cat, ws)).toBe(true);
  });

  it('дефолтный набор — база: поведение без правок не изменилось', () => {
    expect(wheelItems([], 'ru')).toEqual(wheelItems([], 'ru', BASE_WHEEL));
    expect(nameOf('whisky', 'ru')).toBe('Виски');
  });
});
