/**
 * Колесо целиком — геометрия санбёрста для режимов КАРТА и ПОЛОТНО (BJ-12).
 *
 * Уровни (`wheel-view.ts`) показывают по одному кольцу за раз и считают углы от
 * числа секторов. Здесь другое: на экране все три кольца сразу, и угол узла
 * задаётся **весом** — числом листьев внутри него. Поэтому «Фруктовое» с
 * двадцатью дескрипторами занимает больше дуги, чем «Другое» с пятью, и карта
 * читается как карта, а не как ровный пирог.
 *
 * Ни React, ни Dexie: на вход — набор колеса (база плюс правки), на выход —
 * список дуг с готовыми путями, подписями и точками памяти. Тест проверяет
 * числа, компонент рядом только раскладывает.
 *
 * Полотно — та же геометрия с коэффициентом {@link CANVAS_K}: увеличены и
 * радиусы, и толщины, а кегли — своим множителем, иначе подписи на панораме
 * оказались бы нечитаемо мелкими относительно колец.
 */

import { type WheelSet, lightnessFor } from '../../../data/wheel.js';
import type { Lang } from '../../../db/schema.js';
import { arcPath } from '../../../domain/geometry.js';

/* ── Размеры ─────────────────────────────────────────────────────────────── */

/** Сторона карты при 100 % зума. */
export const MAP_SIZE = 820;

/** Радиусы колец на стороне 820: хаб, категории, подкатегории, листья. */
export const MAP_R = Object.freeze({ hub: 64, cat: 128, sub: 212, desc: 356 });

/** Зазор между секторами, радианы. Уже, чем у уровней: секторов много. */
export const MAP_GAP = 0.004;

/** Ноль отсчёта — 12 часов, углы растут по часовой (ось Y в SVG вниз). */
const TOP = -Math.PI / 2;

/** Полотно: та же картина в три раза крупнее. */
export const CANVAS_K = 3;

/** Кегли на полотне растут медленнее радиусов — иначе подписи слиплись бы. */
export const CANVAS_FONT_K = 2.7;

/** Зум карты в процентах: 55…130 с шагом 15 (README:74). */
export const MAP_ZOOM_MIN = 55;
export const MAP_ZOOM_MAX = 130;
export const MAP_ZOOM_STEP = 15;
export const MAP_ZOOM_DEFAULT = 100;

/** Зум после тапа по −/+. За края диапазона не выходит. */
export function clampZoom(zoom: number): number {
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, zoom));
}

/** Сторона холста в пикселях при данном зуме. */
export function mapPixels(zoom: number): number {
  return Math.round((MAP_SIZE * clampZoom(zoom)) / 100);
}

/* ── Веса ────────────────────────────────────────────────────────────────── */

/**
 * Вес подкатегории — число её листьев, но не меньше единицы: пустая
 * подкатегория (такая появляется сразу после «+ ВНУТРЬ») обязана остаться
 * видимой, иначе её нечем будет тапнуть, чтобы наполнить.
 */
export function subWeight(count: number): number {
  return Math.max(1, count);
}

/** Вес категории — сумма весов её подкатегорий. */
export function catWeight(subs: readonly { readonly d: readonly unknown[] }[]): number {
  return subs.reduce((sum, sub) => sum + subWeight(sub.d.length), 0) || 1;
}

/* ── Дуги ────────────────────────────────────────────────────────────────── */

export type MapKind = 'cat' | 'sub' | 'desc';

export interface MapLabel {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  /** Градусы; в левой половине круга добавлено 180°, иначе текст вверх ногами. */
  readonly rot: number;
  readonly anchor: 'middle' | 'start' | 'end';
  readonly size: number;
  readonly weight: number;
}

export interface MapArc {
  readonly id: string;
  readonly kind: MapKind;
  readonly label: MapLabel;
  /** SVG-путь кольцевого сектора. */
  readonly d: string;
  /** Заливка — единственный цвет, которого нет в токенах: он посчитан. */
  readonly fill: string;
  /** Толщина шва; выбранный узел обводится толще. */
  readonly stroke: number;
  /** Точка памяти у внешнего края листа; `null` — здесь ещё не бывали. */
  readonly mem: { readonly cx: number; readonly cy: number; readonly r: number } | null;
}

/** Поворот подписи и нужен ли ей флип (левая половина круга). */
function radial(am: number): { rot: number; flip: boolean } {
  const deg = (am * 180) / Math.PI;
  const flip = Math.cos(am) < 0;
  return { rot: flip ? deg + 180 : deg, flip };
}

export interface MapOptions {
  /** Выбранные узлы — обводка `--text`. */
  readonly picked: ReadonlySet<string>;
  /** Дескрипторы, которые уже выбирались, — точки памяти. */
  readonly memory: ReadonlySet<string>;
  /** 1 — карта, {@link CANVAS_K} — полотно. */
  readonly k?: number;
}

/**
 * Все дуги колеса — категории, подкатегории и листья одним списком, в порядке
 * отрисовки.
 *
 * Порядок значим: кольца рисуются от центра наружу, и лист ложится поверх шва
 * своей подкатегории — так же, как в эталоне.
 */
export function mapArcs(ws: WheelSet, lang: Lang, options: MapOptions): MapArc[] {
  const { picked, memory } = options;
  const k = options.k ?? 1;
  const fk = k === 1 ? 1 : CANVAS_FONT_K;

  const size = MAP_SIZE * k;
  const c = size / 2;
  const rHub = MAP_R.hub * k;
  const rCat = MAP_R.cat * k;
  const rSub = MAP_R.sub * k;
  const rDesc = MAP_R.desc * k;

  const total = ws.cats.reduce((sum, cat) => sum + catWeight(cat.sub), 0);
  const unit = (2 * Math.PI) / Math.max(1, total);
  const out: MapArc[] = [];

  const label = (
    text: string,
    r: number,
    am: number,
    size9: number,
    weight: number,
  ): MapLabel => {
    const { rot } = radial(am);
    return {
      text,
      x: c + Math.cos(am) * r,
      y: c + Math.sin(am) * r,
      rot,
      anchor: 'middle',
      size: size9 * fk,
      weight,
    };
  };

  let a = TOP;
  ws.cats.forEach((cat, ci) => {
    const cw = catWeight(cat.sub) * unit;
    out.push({
      id: cat.id,
      kind: 'cat',
      d: arcPath(c, c, rHub, rCat, a + MAP_GAP, a + cw - MAP_GAP),
      fill: `oklch(${lightnessFor(0, ci, ws.cats.length).toFixed(3)} ${cat.c} ${cat.h})`,
      stroke: (picked.has(cat.id) ? 2.5 : 1.5) * k,
      label: label(cat[lang], (rHub + rCat) / 2, a + cw / 2, 9.5, 700),
      mem: null,
    });

    let sa = a;
    cat.sub.forEach((sub, si) => {
      const sw = subWeight(sub.d.length) * unit;
      out.push({
        id: sub.id,
        kind: 'sub',
        d: arcPath(c, c, rCat, rSub, sa + MAP_GAP, sa + sw - MAP_GAP),
        fill: `oklch(${lightnessFor(1, si, cat.sub.length).toFixed(3)} ${cat.c} ${cat.h})`,
        stroke: (picked.has(sub.id) ? 2.5 : 1.2) * k,
        label: label(sub[lang], (rCat + rSub) / 2, sa + sw / 2, 8.5, 600),
        mem: null,
      });

      sub.d.forEach((desc, di) => {
        const [id, ru, en] = desc;
        const a0 = sa + di * unit + MAP_GAP;
        const a1 = sa + (di + 1) * unit - MAP_GAP;
        const am = (a0 + a1) / 2;
        const { rot, flip } = radial(am);
        // Подпись листа сидит не по центру кольца, а у его внутреннего края:
        // сектор узкий, и по центру текст перекрыл бы соседей.
        const lx = c + Math.cos(am) * (rSub + 12 * k);
        const ly = c + Math.sin(am) * (rSub + 12 * k);

        out.push({
          id,
          kind: 'desc',
          d: arcPath(c, c, rSub, rDesc, a0, a1),
          fill: `oklch(${lightnessFor(2, di, sub.d.length).toFixed(3)} ${cat.c} ${cat.h})`,
          stroke: (picked.has(id) ? 2.5 : 1) * k,
          label: {
            text: lang === 'ru' ? ru : en,
            x: lx,
            y: ly,
            rot,
            anchor: flip ? 'end' : 'start',
            size: 8 * fk,
            weight: 500,
          },
          mem: memory.has(id)
            ? {
                cx: c + Math.cos(am) * (rDesc - 8 * k),
                cy: c + Math.sin(am) * (rDesc - 8 * k),
                r: 2.5 * k,
              }
            : null,
        });
      });

      sa += sw;
    });

    a += cw;
  });

  return out;
}

/* ── Мини-карта полотна ──────────────────────────────────────────────────── */

/** Сторона мини-карты и её колеса (README:80). */
export const MINI_BOX = 76;
export const MINI_SIZE = 64;

/** Рамка видимой области в координатах мини-карты. */
export interface Viewport {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ScrollBox {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
}

/**
 * Куда встала видимая область полотна — доля прокрутки, умноженная на сторону
 * мини-карты.
 *
 * Минимум в 8 px оставлен нарочно: на полотне видно около трети колеса, и
 * честная рамка была бы тоньше волоса.
 */
export function viewportRect(box: ScrollBox, side = MINI_BOX - 2): Viewport {
  const safe = (value: number): number => (value > 0 ? value : 1);
  return {
    left: (box.scrollLeft / safe(box.scrollWidth)) * side,
    top: (box.scrollTop / safe(box.scrollHeight)) * side,
    width: Math.max(8, (box.clientWidth / safe(box.scrollWidth)) * side),
    height: Math.max(8, (box.clientHeight / safe(box.scrollHeight)) * side),
  };
}

/** Прокрутка, при которой центр холста оказывается в центре окна. */
export function centerScroll(box: {
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}): { left: number; top: number } {
  return {
    left: Math.max(0, (box.scrollWidth - box.clientWidth) / 2),
    top: Math.max(0, (box.scrollHeight - box.clientHeight) / 2),
  };
}

/**
 * Сдвиг пальцем/мышью считается прокруткой, а не тапом, начиная с этого порога.
 *
 * Без него любой протяг по полотну заканчивался бы выбором случайного узла:
 * click приходит после pointerup, и отличить его от жеста больше нечем.
 */
export const TAP_SLOP = 8;

/** Ушёл ли указатель дальше порога — тогда это панорама, а не выбор. */
export function movedTooFar(dx: number, dy: number): boolean {
  return Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP;
}
