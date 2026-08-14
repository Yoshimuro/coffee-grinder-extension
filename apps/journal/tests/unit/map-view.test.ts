import { describe, expect, it } from 'vitest';

import { BASE_WHEEL, type WheelSet } from '../../src/data/wheel.js';
import {
  CANVAS_K,
  MAP_SIZE,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  catWeight,
  centerScroll,
  clampZoom,
  mapArcs,
  mapPixels,
  movedTooFar,
  subWeight,
  viewportRect,
} from '../../src/ui/screens/wheel/map-view.js';
import { wheelList } from '../../src/ui/screens/wheel/list-view.js';

const NONE: ReadonlySet<string> = new Set();

/* Маленькое колесо: две категории разного веса — на нём видно, что угол идёт
   от числа листьев, а не от числа категорий. */
const small: WheelSet = {
  cats: [
    {
      id: 'fruit',
      ru: 'Фруктовое',
      en: 'Fruity',
      h: 30,
      c: 0.15,
      sub: [
        {
          id: 'berry',
          ru: 'Ягоды',
          en: 'Berry',
          d: [
            ['straw', 'клубника', 'strawberry'],
            ['rasp', 'малина', 'raspberry'],
            ['blue', 'черника', 'blueberry'],
          ],
        },
      ],
    },
    {
      id: 'other',
      ru: 'Другое',
      en: 'Other',
      h: 200,
      c: 0.1,
      sub: [{ id: 'paper', ru: 'Бумага', en: 'Paper', d: [['card', 'картон', 'cardboard']] }],
    },
  ],
  desc: {},
};

describe('веса узлов', () => {
  it('вес подкатегории — число листьев, но не меньше единицы', () => {
    expect(subWeight(3)).toBe(3);
    // Пустая подкатегория остаётся видимой: её ещё нечем наполнить.
    expect(subWeight(0)).toBe(1);
  });

  it('вес категории — сумма её подкатегорий', () => {
    expect(catWeight(small.cats[0]?.sub ?? [])).toBe(3);
    expect(catWeight(small.cats[1]?.sub ?? [])).toBe(1);
    expect(catWeight([])).toBe(1);
  });
});

describe('mapArcs', () => {
  const arcs = mapArcs(small, 'ru', { picked: NONE, memory: NONE });

  it('отдаёт все три кольца одним списком', () => {
    expect(arcs.map((a) => a.id)).toEqual([
      'fruit',
      'berry',
      'straw',
      'rasp',
      'blue',
      'other',
      'paper',
      'card',
    ]);
    expect(arcs.filter((a) => a.kind === 'desc')).toHaveLength(4);
  });

  it('делит круг по листьям: категория из трёх листьев занимает три четверти', () => {
    /* Отсчёт от 12 часов по часовой. «Фруктовое» весит 3 из 4 листьев, то есть
       занимает 3/4 круга: от −90° до 180°, середина на 45° — справа внизу.
       «Другое» получает оставшуюся четверть с серединой на 225° — слева
       вверху. Ширину сектора видно по подписи: она стоит на его середине. */
    const fruit = arcs.find((a) => a.id === 'fruit');
    const other = arcs.find((a) => a.id === 'other');
    expect(fruit?.label.x).toBeGreaterThan(MAP_SIZE / 2);
    expect(fruit?.label.y).toBeGreaterThan(MAP_SIZE / 2);
    expect(other?.label.x).toBeLessThan(MAP_SIZE / 2);
    expect(other?.label.y).toBeLessThan(MAP_SIZE / 2);
  });

  it('подписи левой половины перевёрнуты, а у листа якорь меняется на конец', () => {
    /* «Черника» — третий лист, её середина на 135°: левая половина круга. */
    const blue = arcs.find((a) => a.id === 'blue');
    expect(blue?.label.rot).toBeCloseTo(315, 5);
    expect(blue?.label.anchor).toBe('end');
    /* «Клубника» — первый лист, середина на −45°: правая половина, флипа нет. */
    const straw = arcs.find((a) => a.id === 'straw');
    expect(straw?.label.rot).toBeCloseTo(-45, 5);
    expect(straw?.label.anchor).toBe('start');
  });

  it('выбранный узел обводится толще', () => {
    const on = mapArcs(small, 'ru', { picked: new Set(['berry']), memory: NONE });
    expect(on.find((a) => a.id === 'berry')?.stroke).toBe(2.5);
    expect(on.find((a) => a.id === 'fruit')?.stroke).toBe(1.5);
  });

  it('точку памяти получает только лист, на котором бывали', () => {
    const mem = mapArcs(small, 'ru', { picked: NONE, memory: new Set(['blue']) });
    expect(mem.find((a) => a.id === 'blue')?.mem).not.toBeNull();
    expect(mem.find((a) => a.id === 'straw')?.mem).toBeNull();
    // Кольца категорий точек не носят: память — про листья.
    expect(mem.find((a) => a.id === 'fruit')?.mem).toBeNull();
  });

  it('полотно — та же геометрия втрое крупнее', () => {
    const big = mapArcs(small, 'ru', { picked: NONE, memory: NONE, k: CANVAS_K });
    const flat = arcs.find((a) => a.id === 'fruit');
    const scaled = big.find((a) => a.id === 'fruit');
    expect(scaled?.stroke).toBe((flat?.stroke ?? 0) * CANVAS_K);
    // Кегли растут своим множителем — медленнее радиусов.
    expect(scaled?.label.size).toBeCloseTo((flat?.label.size ?? 0) * 2.7, 5);
  });

  it('на боевом колесе не роняется и рисует все листья', () => {
    const full = mapArcs(BASE_WHEEL, 'en', { picked: NONE, memory: NONE });
    const leaves = BASE_WHEEL.cats.reduce(
      (sum, cat) => sum + cat.sub.reduce((x, sub) => x + sub.d.length, 0),
      0,
    );
    expect(full.filter((a) => a.kind === 'desc')).toHaveLength(leaves);
    expect(full.every((a) => a.d.startsWith('M '))).toBe(true);
  });
});

describe('зум и прокрутка', () => {
  it('зажимается диапазоном 55–130 %', () => {
    expect(clampZoom(40)).toBe(MAP_ZOOM_MIN);
    expect(clampZoom(200)).toBe(MAP_ZOOM_MAX);
    expect(clampZoom(85)).toBe(85);
  });

  it('переводит проценты в пиксели холста', () => {
    expect(mapPixels(100)).toBe(MAP_SIZE);
    expect(mapPixels(55)).toBe(Math.round(MAP_SIZE * 0.55));
  });

  it('центрирует холст в окне', () => {
    expect(
      centerScroll({ scrollWidth: 820, scrollHeight: 820, clientWidth: 320, clientHeight: 500 }),
    ).toEqual({ left: 250, top: 160 });
    // Холст меньше окна — прокручивать некуда.
    expect(
      centerScroll({ scrollWidth: 200, scrollHeight: 200, clientWidth: 320, clientHeight: 500 }),
    ).toEqual({ left: 0, top: 0 });
  });

  it('рамка обзора идёт за прокруткой и не тоньше восьми пикселей', () => {
    const vp = viewportRect({
      scrollLeft: 1230,
      scrollTop: 0,
      scrollWidth: 2460,
      scrollHeight: 2460,
      clientWidth: 360,
      clientHeight: 600,
    });
    expect(vp.left).toBeCloseTo(37, 5);
    expect(vp.top).toBe(0);
    expect(vp.width).toBeCloseTo(10.83, 1);
    expect(vp.height).toBeCloseTo(18.05, 1);

    const tiny = viewportRect({
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 100000,
      scrollHeight: 100000,
      clientWidth: 360,
      clientHeight: 600,
    });
    expect(tiny.width).toBe(8);
    expect(tiny.height).toBe(8);
  });

  it('протяг дальше порога считается панорамой, а не тапом', () => {
    expect(movedTooFar(2, 3)).toBe(false);
    expect(movedTooFar(0, -12)).toBe(true);
  });
});

describe('wheelList', () => {
  const list = wheelList(small, 'ru', new Set(['blue', 'other']), new Set(['straw']));

  it('считает листья категории', () => {
    expect(list.map((c) => c.count)).toEqual([3, 1]);
  });

  it('помечает выбранное на всех трёх уровнях', () => {
    expect(list[1]?.selected).toBe(true);
    expect(list[0]?.subs[0]?.chips.find((c) => c.id === 'blue')?.selected).toBe(true);
    expect(list[0]?.subs[0]?.chips.find((c) => c.id === 'blue')?.border).not.toBeNull();
    expect(list[0]?.subs[0]?.chips.find((c) => c.id === 'rasp')?.border).toBeNull();
  });

  it('переносит память в чипы', () => {
    expect(list[0]?.subs[0]?.chips.find((c) => c.id === 'straw')?.remembered).toBe(true);
    expect(list[0]?.subs[0]?.chips.find((c) => c.id === 'rasp')?.remembered).toBe(false);
  });

  it('берёт подписи текущего языка', () => {
    expect(wheelList(small, 'en', new Set(), new Set())[0]?.label).toBe('Fruity');
    expect(wheelList(small, 'en', new Set(), new Set())[0]?.subs[0]?.chips[0]?.label).toBe(
      'strawberry',
    );
  });
});
