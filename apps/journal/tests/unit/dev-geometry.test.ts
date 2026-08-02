import { describe, expect, it } from 'vitest';

import { KNOWN_DEVICES, TRAITS, TRAIT_KEYS } from '../../src/data/traits.js';
import type { DeviceTraits } from '../../src/ui/screens/devices/dev-geometry.js';
import { devFrame, devShapes } from '../../src/ui/screens/devices/dev-geometry.js';
import { devLine, draftNote, NEW_DEVICE } from '../../src/ui/screens/devices/dev-view.js';

const v60: DeviceTraits = {
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};

/** Все сочетания признаков — 3·4·4·6·4·3 = 3456 девайсов. */
function everyDevice(): DeviceTraits[] {
  const out: DeviceTraits[] = [];
  for (const flow of Object.keys(TRAITS.flow.opts))
    for (const bottom of Object.keys(TRAITS.bottom.opts))
      for (const wall of Object.keys(TRAITS.wall.opts))
        for (const filter of Object.keys(TRAITS.filter.opts))
          for (const material of Object.keys(TRAITS.material.opts))
            for (const vol of Object.keys(TRAITS.vol.opts))
              out.push({ flow, bottom, wall, filter, material, vol } as DeviceTraits);
  return out;
}

describe('devFrame', () => {
  it('строит конус: узкое дно на 148, верх 88 при объёме m', () => {
    const f = devFrame(v60);
    expect(f).toMatchObject({ cx: 150, topY: 30, hb: 9, by: 148, ht: 88 });
    expect(f.L1).toEqual([62, 30]);
    expect(f.R1).toEqual([238, 30]);
    expect(f.L2).toEqual([141, 148]);
    expect(f.R2).toEqual([159, 148]);
  });

  it('масштабирует по объёму, но конусное дно оставляет как есть', () => {
    expect(devFrame({ ...v60, vol: 's' }).ht).toBeCloseTo(88 * 0.82);
    expect(devFrame({ ...v60, vol: 'l' }).ht).toBeCloseTo(88 * 1.15);
    // Носик конуса от объёма не зависит — он и так узкий.
    expect(devFrame({ ...v60, vol: 'l' }).hb).toBe(9);
    // Плоское дно зависит.
    expect(devFrame({ ...v60, bottom: 'flat', vol: 'l' }).hb).toBeCloseTo(42 * 1.15);
  });

  it('делает цилиндр отвесным: верх равен низу', () => {
    const f = devFrame({ ...v60, bottom: 'cyl' });
    expect(f.ht).toBe(f.hb);
    expect(f.by).toBe(150);
  });
});

describe('devShapes', () => {
  const roles = (d: DeviceTraits) => devShapes(d).map((s) => s.role);

  it('рисует обод, две стенки и стол у любого девайса', () => {
    for (const d of KNOWN_DEVICES) {
      const shapes = devShapes(d);
      expect(shapes.length).toBeGreaterThan(4);
      expect(shapes.at(-1)?.role).toBe('table');
    }
  });

  it('замыкает дно у всех, кроме конуса', () => {
    const cone = devShapes(v60);
    const flat = devShapes({ ...v60, bottom: 'flat' });
    // Четвёртая линия у неконуса — дно; у конуса её нет.
    expect(flat.filter((s) => s.role === 'body').length).toBeGreaterThan(
      cone.filter((s) => s.role === 'body').length,
    );
  });

  describe('толщина стенки — D-2', () => {
    it('ранжирует материалы по README: керамика > металл > стекло > пластик', () => {
      const inner = (material: DeviceTraits['material']) =>
        devShapes({ ...v60, material }).filter((s) => s.role === 'inner');

      // У пластика двойной стенки нет вовсе.
      expect(inner('plastic')).toHaveLength(0);
      expect(inner('glass').length).toBeGreaterThan(0);

      /* Смещение внутреннего контура читается по x первой внутренней линии:
         чем толще стенка, тем дальше она от L1 (x = 62). */
      const offsetOf = (material: DeviceTraits['material']) => {
        const line = inner(material)[0];
        if (line?.kind !== 'line') throw new Error('нет внутренней линии');
        return line.x1 - 62;
      };

      // Смещение восстанавливается вычитанием координат, поэтому сравнение
      // приблизительное: 62 + 1.8 − 62 в двоичной плавающей точке даёт
      // 1.7999999999999972. Порядок между материалами это не размывает.
      expect(offsetOf('ceramic')).toBeCloseTo(5.5);
      expect(offsetOf('metal')).toBeCloseTo(2.5);
      expect(offsetOf('glass')).toBeCloseTo(1.8);
      expect(offsetOf('ceramic')).toBeGreaterThan(offsetOf('metal'));
      expect(offsetOf('metal')).toBeGreaterThan(offsetOf('glass'));
    });

    it('не замыкает внутреннее дно у конуса', () => {
      expect(devShapes({ ...v60, material: 'ceramic' }).filter((s) => s.role === 'inner')).toHaveLength(2);
      expect(
        devShapes({ ...v60, bottom: 'flat', material: 'ceramic' }).filter((s) => s.role === 'inner'),
      ).toHaveLength(3);
    });
  });

  describe('текстура стенки', () => {
    it('даёт рёбрам 4 штриха, спирали и лепесткам по 8', () => {
      const tex = (wall: DeviceTraits['wall']) =>
        devShapes({ ...v60, wall, flow: 'imm' }).filter((s) => s.role === 'tex');

      expect(tex('ribs')).toHaveLength(4);
      expect(tex('spiral')).toHaveLength(8);
      expect(tex('petal')).toHaveLength(8);
      // Гладкая стенка — это отсутствие текстуры, а не её вид.
      expect(tex('smooth')).toHaveLength(0);
    });

    it('рисует лепестки кривыми, а рёбра — прямыми', () => {
      expect(
        devShapes({ ...v60, wall: 'petal', flow: 'imm' }).filter((s) => s.kind === 'path'),
      ).toHaveLength(8);
      expect(
        devShapes({ ...v60, wall: 'ribs', flow: 'imm' }).filter((s) => s.kind === 'path'),
      ).toHaveLength(0);
    });
  });

  describe('фильтр', () => {
    it('ставит две пунктирные линии по стенкам', () => {
      const dashed = devShapes({ ...v60, wall: 'smooth' }).filter(
        (s) => s.role === 'filter' && s.kind === 'line' && s.dash === '5 4',
      );
      expect(dashed).toHaveLength(2);
    });

    it('различает пунктиры по типу фильтра', () => {
      const dashOf = (filter: DeviceTraits['filter']) => {
        const line = devShapes({ ...v60, filter, wall: 'smooth' }).find(
          (s) => s.role === 'filter',
        );
        return line?.kind === 'line' ? line.dash : undefined;
      };

      expect(dashOf('pcone')).toBe('5 4');
      expect(dashOf('wave')).toBe('2 3');
      expect(dashOf('metal')).toBe('1 3');
      expect(dashOf('cloth')).toBe('7 3 2 3');
      // Диск лежит поперёк дна, а не вдоль стенок.
      expect(dashOf('pflat')).toBe('4 3');
      // Встроенный фильтр не рисуется: он внутри стенки.
      expect(dashOf('built')).toBeUndefined();
    });

    it('кладёт бумажный диск горизонтально на дно', () => {
      const disc = devShapes({ ...v60, filter: 'pflat', bottom: 'flat', wall: 'smooth' }).find(
        (s) => s.role === 'filter',
      );
      if (disc?.kind !== 'line') throw new Error('нет диска');
      expect(disc.y1).toBe(disc.y2);
    });
  });

  describe('поток', () => {
    it('даёт гибриду кружок клапана', () => {
      expect(devShapes({ ...v60, flow: 'hybrid' }).filter((s) => s.kind === 'circle')).toHaveLength(1);
      expect(devShapes({ ...v60, flow: 'perc' }).filter((s) => s.kind === 'circle')).toHaveLength(0);
      expect(devShapes({ ...v60, flow: 'imm' }).filter((s) => s.kind === 'circle')).toHaveLength(0);
    });

    it('даёт проливу пунктирную струю под дном', () => {
      const jet = devShapes({ ...v60, wall: 'smooth', filter: 'built' }).find(
        (s) => s.role === 'tex' && s.kind === 'line' && s.dash === '2 5',
      );
      expect(jet).toBeDefined();
    });

    it('глушит дно иммерсии, но не у цилиндра — там поршень', () => {
      const immCone = devShapes({ ...v60, flow: 'imm' });
      const immCyl = devShapes({ ...v60, flow: 'imm', bottom: 'cyl' });
      // Поршень — три линии: диск, шток, ручка.
      expect(immCyl.filter((s) => s.role === 'body').length).toBeGreaterThan(
        immCone.filter((s) => s.role === 'body').length,
      );
    });
  });

  it('не роняет ни одно из 3456 сочетаний признаков', () => {
    const all = everyDevice();
    expect(all).toHaveLength(3 * 4 * 4 * 6 * 4 * 3);

    for (const device of all) {
      const shapes = devShapes(device);
      expect(shapes.length).toBeGreaterThan(0);
      for (const shape of shapes) {
        if (shape.kind === 'line') {
          for (const n of [shape.x1, shape.y1, shape.x2, shape.y2])
            expect(Number.isFinite(n)).toBe(true);
        } else if (shape.kind === 'circle') {
          for (const n of [shape.cx, shape.cy, shape.r]) expect(Number.isFinite(n)).toBe(true);
        } else {
          expect(shape.d).not.toContain('NaN');
        }
      }
    }
  });

  it('перерисовывается от смены любого признака', () => {
    const base = JSON.stringify(devShapes(v60));
    for (const key of TRAIT_KEYS) {
      const other = Object.keys(TRAITS[key].opts).find((o) => o !== v60[key]);
      if (other === undefined) continue;
      const changed = JSON.stringify(devShapes({ ...v60, [key]: other }));
      expect(changed, `признак ${key} ничего не изменил`).not.toBe(base);
    }
  });

  it('чист от побочных эффектов: два вызова дают одно и то же', () => {
    expect(devShapes(v60)).toEqual(devShapes(v60));
  });
});

describe('dev-view', () => {
  it('собирает тех-строку из пяти признаков без объёма', () => {
    expect(devLine(v60, 'ru')).toBe('Пролив · Конус · Спираль · Бумага · конус · Пластик');
    expect(devLine(v60, 'en')).toBe('Percolation · Cone · Spiral · Paper cone · Plastic');
  });

  it('объясняет стенку и материал', () => {
    expect(draftNote(v60, 'ru')).toBe(
      'спираль ведёт поток к центру · пластик почти не крадёт тепло',
    );
    expect(draftNote({ ...v60, wall: 'petal', material: 'ceramic' }, 'en')).toBe(
      'petals reduce paper contact — faster flow · ceramic holds heat — preheat longer',
    );
  });

  it('даёт заметку любому сочетанию стенки и материала', () => {
    for (const wall of Object.keys(TRAITS.wall.opts))
      for (const material of Object.keys(TRAITS.material.opts)) {
        const note = draftNote({ ...v60, wall, material } as DeviceTraits, 'ru');
        expect(note).toBeTruthy();
        expect(note).not.toContain('undefined');
      }
  });

  it('стартует новый девайс с V60 — самой частой воронки', () => {
    expect(NEW_DEVICE).toMatchObject({ flow: 'perc', bottom: 'cone', filter: 'pcone' });
    expect(NEW_DEVICE.name).toBe('');
  });
});
