/**
 * Генеративный чертёж девайса — геометрия (`devSvg`, `DC:1099-1129`;
 * component-report §7.1-7.7).
 *
 * Смысл чертежа: девайс не выбирают из списка марок, а описывают признаками, и
 * рисунок — обратная связь на этот выбор. Он не иллюстрация, а проверка: если
 * человек ошибся группой, он видит это раньше, чем сохранит.
 *
 * Здесь только координаты. Цвета живут в `devices.css` классами по роли линии,
 * потому что палитра — это токены, а токен в атрибут `stroke` не подставишь.
 * Разделение заодно делает геометрию тестируемой: формы — обычные данные, и
 * тест сверяет числа, а не разметку.
 *
 * D-2 задачи: толщины стенок по README (керамика 5.5 > металл > стекло >
 * пластик 0), а не по коду прототипа, где стекло было толще металла.
 */

import type {
  DeviceBottom,
  DeviceMaterial,
  DeviceRecord,
  DeviceVolume,
} from '../../../db/schema.js';

/** Признаки, из которых строится чертёж. Имя и id ему не нужны. */
export type DeviceTraits = Pick<
  DeviceRecord,
  'flow' | 'bottom' | 'wall' | 'filter' | 'material' | 'vol'
>;

/** Система координат прототипа. Размер задаётся снаружи, пропорции — здесь. */
export const VIEW_BOX = '0 0 300 190';
/** Размер чертежа в конструкторе и в строке списка (`DC:1128`). */
export const BIG_SIZE = { width: 276, height: 175 } as const;
export const SMALL_SIZE = { width: 58, height: 37 } as const;

/**
 * Роль линии — она же класс в CSS. Разделены не по красоте, а по смыслу:
 * корпус читается первым, внутренний контур и текстуры — фон, стол — почти
 * невидимая опора.
 */
export type LineRole = 'body' | 'inner' | 'tex' | 'filter' | 'table';

export type Shape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; role: LineRole; w: number; dash?: string }
  | { kind: 'path'; d: string; role: LineRole; w: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; role: LineRole; w: number };

/* ── Константы прототипа ─────────────────────────────────────────────────── */

const CX = 150;
const TOP_Y = 30;

/** Масштаб по объёму (`DC:1100`). */
const SCALE: Record<DeviceVolume, number> = { s: 0.82, m: 1, l: 1.15 };

/**
 * Толщина стенки по материалу — D-2.
 *
 * README ранжирует материалы по тому, как они держат тепло: керамика толще
 * всех, пластик стенки не имеет вовсе. Прототип (`DC:1113`) ставил стекло 2.5,
 * а металл 1.8 — обратный порядок; шаг сетки сохранён, glass и metal
 * переставлены местами.
 */
const WALL_OFFSET: Record<DeviceMaterial, number> = {
  ceramic: 5.5,
  metal: 2.5,
  glass: 1.8,
  plastic: 0,
};

/** Пунктиры фильтров (`DC:1120`). `built` не рисуется вовсе — он внутри стенки. */
const FILTER_DASH: Partial<Record<DeviceRecord['filter'], string>> = {
  pcone: '5 4',
  wave: '2 3',
  metal: '1 3',
  cloth: '7 3 2 3',
};

/* ── Опорные точки ───────────────────────────────────────────────────────── */

type Point = readonly [x: number, y: number];

/** Полуширина дна и его высота по типу дна (`DC:1101-1104`). */
function bottomOf(bottom: DeviceBottom, sc: number): { hb: number; by: number } {
  if (bottom === 'cone') return { hb: 9, by: 148 };
  if (bottom === 'flat') return { hb: 42 * sc, by: 136 };
  if (bottom === 'basket') return { hb: 64 * sc, by: 110 };
  return { hb: 54 * sc, by: 150 };
}

/** Точка на отрезке (`P`, `DC:1115`). */
function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export interface DevFrame {
  cx: number;
  topY: number;
  /** Полуширина верха и низа. */
  ht: number;
  hb: number;
  /** Y дна. */
  by: number;
  L1: Point;
  L2: Point;
  R1: Point;
  R2: Point;
}

/** Скелет чертежа: четыре угла корпуса (`DC:1100-1108`). */
export function devFrame(device: DeviceTraits): DevFrame {
  const sc = SCALE[device.vol];
  const { hb, by } = bottomOf(device.bottom, sc);
  // У цилиндра стенки отвесные — верх равен низу.
  const ht = device.bottom === 'cyl' ? hb : 88 * sc;

  return {
    cx: CX,
    topY: TOP_Y,
    ht,
    hb,
    by,
    L1: [CX - ht, TOP_Y],
    L2: [CX - hb, by],
    R1: [CX + ht, TOP_Y],
    R2: [CX + hb, by],
  };
}

/* ── Сборка ──────────────────────────────────────────────────────────────── */

function line(
  a: Point,
  b: Point,
  role: LineRole = 'body',
  w = 1.4,
  dash?: string,
): Shape {
  const shape: Shape = { kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], role, w };
  return dash === undefined ? shape : { ...shape, dash };
}

/**
 * Все линии чертежа в порядке отрисовки: корпус, внутренний контур, текстура
 * стенки, фильтр, поток, поршень, стол.
 */
export function devShapes(device: DeviceTraits): Shape[] {
  const f = devFrame(device);
  const { cx, topY, ht, hb, by, L1, L2, R1, R2 } = f;
  const out: Shape[] = [];

  /* ── Корпус (§7.1) ─────────────────────────────────────────────────────── */
  // Обод свисает на 9px с каждой стороны и толще стенок — за него берут рукой.
  out.push(line([cx - ht - 9, topY], [cx + ht + 9, topY], 'body', 1.8));
  out.push(line(L1, L2));
  out.push(line(R1, R2));
  if (device.bottom !== 'cone') out.push(line(L2, R2));

  /* ── Толщина стенки (§7.2, D-2) ────────────────────────────────────────── */
  const off = WALL_OFFSET[device.material];
  if (off > 0) {
    // Внутренний контур сходится к дну с коэффициентом 0.7; у конуса не
    // доводится до вершины, иначе две линии слиплись бы в одну точку.
    const dy = device.bottom === 'cone' ? 7 : 0;
    out.push(line([L1[0] + off, topY], [L2[0] + off * 0.7, by - dy], 'inner', 1));
    out.push(line([R1[0] - off, topY], [R2[0] - off * 0.7, by - dy], 'inner', 1));
    if (device.bottom !== 'cone')
      out.push(
        line(
          [L2[0] + off * 0.7, by - off * 0.9],
          [R2[0] - off * 0.7, by - off * 0.9],
          'inner',
          1,
        ),
      );
  }

  /* ── Текстура стенки (§7.3) ────────────────────────────────────────────── */
  if (device.wall === 'ribs') {
    for (const fr of [-0.62, -0.31, 0.31, 0.62])
      out.push(line([cx + fr * ht, topY + 5], [cx + fr * hb, by - 4], 'tex', 1));
  } else if (device.wall === 'spiral') {
    for (const s of [1, -1] as const) {
      const [a, b] = s === 1 ? ([L1, L2] as const) : ([R1, R2] as const);
      for (const t of [0.18, 0.38, 0.58, 0.78]) {
        const [px, py] = lerp(a, b, t);
        out.push(line([px + s * 3, py - 4], [px + s * 14, py + 5], 'tex', 1));
      }
    }
  } else if (device.wall === 'petal') {
    for (const s of [1, -1] as const) {
      const [a, b] = s === 1 ? ([L1, L2] as const) : ([R1, R2] as const);
      for (const t of [0.15, 0.38, 0.61, 0.8]) {
        const [px, py] = lerp(a, b, t);
        out.push({
          kind: 'path',
          d: `M ${px + s * 2} ${py - 6} q ${s * 9} 7 0 13`,
          role: 'tex',
          w: 1,
        });
      }
    }
  }
  // `smooth` не рисуется: гладкая стенка — это отсутствие текстуры.

  /* ── Фильтр (§7.4) ─────────────────────────────────────────────────────── */
  const dash = FILTER_DASH[device.filter];
  if (dash !== undefined) {
    const a1 = lerp(L1, L2, 0.14);
    const b1 = lerp(L1, L2, 0.94);
    const a2 = lerp(R1, R2, 0.14);
    const b2 = lerp(R1, R2, 0.94);
    out.push(line([a1[0] + 13, a1[1]], [b1[0] + 7, b1[1] - 4], 'filter', 1, dash));
    out.push(line([a2[0] - 13, a2[1]], [b2[0] - 7, b2[1] - 4], 'filter', 1, dash));
  }
  if (device.filter === 'pflat')
    out.push(line([cx - hb + 8, by - 9], [cx + hb - 8, by - 9], 'filter', 1, '4 3'));

  /* ── Поток (§7.5) ──────────────────────────────────────────────────────── */
  if (device.flow === 'hybrid') {
    out.push(line([cx, by], [cx, by + 9]));
    out.push({ kind: 'circle', cx, cy: by + 14, r: 4.5, role: 'body', w: 1.4 });
    out.push(line([cx - 10, by + 22], [cx + 10, by + 22]));
  } else if (device.flow === 'perc') {
    out.push(line([cx, by + 6], [cx, by + 22], 'tex', 1.2, '2 5'));
  } else if (device.bottom !== 'cyl') {
    // Иммерсия: дно глухое, и это видно перемычкой.
    out.push(line([cx - 13, by], [cx + 13, by], 'body', 1.8));
  }

  /* ── Поршень (§7.6) ────────────────────────────────────────────────────── */
  if (device.bottom === 'cyl') {
    out.push(line([cx - hb + 6, 54], [cx + hb - 6, 54], 'body', 1.6));
    out.push(line([cx, 54], [cx, 36]));
    out.push(line([cx - 16, 36], [cx + 16, 36], 'body', 1.8));
  }

  /* ── Стол (§7.1) ───────────────────────────────────────────────────────── */
  out.push(line([cx - 102, 174], [cx + 102, 174], 'table', 1));

  return out;
}
