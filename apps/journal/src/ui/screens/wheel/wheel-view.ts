/**
 * Колесо вкусов — вся арифметика экрана (component-report §8).
 *
 * Здесь нет ни React, ни Dexie: уровни, углы, светлота, крошки и память —
 * чистые функции от `path` и списка записей. SVG рядом только раскладывает
 * готовое, а тест проверяет числа, а не разметку.
 *
 * Геометрия и формулы светлоты перенесены из прототипа дословно (D-2): эталон
 * вида — `offline.html`, и он нарисован именно ими. README называет диапазон
 * 0.60–0.78, фактический максимум формул — 0.82 и 0.84; расхождение
 * зафиксировано решением, а не «поправлено» здесь.
 */

import { STR } from '../../../data/strings.js';
import {
  BASE_WHEEL,
  type WheelSet,
  descById,
  lightnessFor,
  nameOf,
} from '../../../data/wheel.js';
import type { Descriptor, EntryRecord, Lang } from '../../../db/schema.js';

/* ── Геометрия (§8.3) ────────────────────────────────────────────────────── */

export const CX = 175;
export const CY = 175;
/** Внутренний радиус кольца. */
export const R0 = 74;
/** Внешний радиус кольца. */
export const R1 = 170;
/** Зазор между секторами, радианы. */
export const GAP = 0.016;
/** Ноль отсчёта — 12 часов; углы растут по часовой (ось Y в SVG вниз). */
export const TOP = -Math.PI / 2;

export const VIEW_BOX = '0 0 350 350';
/** Сторона рендера. viewBox крупнее — так подписи не теряют точность. */
export const SIZE = 322;

/** Центральная кнопка «наверх». */
export const HUB_R = R0 - 9;
/** Радиус, на котором сидит подпись сектора. */
export const LABEL_R = (R0 + R1) / 2 + 2;
/** Радиус точки памяти и её размер. */
export const MEM_R = R1 - 9;
export const MEM_DOT = 2.3;

/** Точка на радиусе `r` под углом `a`. */
export function polar(r: number, a: number): { x: number; y: number } {
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}

export interface Sector {
  /** Начало сектора с учётом зазора. */
  a0: number;
  a1: number;
  /** Средняя ось — по ней ставятся подпись и точка памяти. */
  am: number;
}

/** Углы `index`-го сектора из `count`. */
export function sectorAngles(index: number, count: number): Sector {
  const step = (2 * Math.PI) / count;
  const a0 = TOP + index * step + GAP;
  const a1 = TOP + (index + 1) * step - GAP;
  return { a0, a1, am: (a0 + a1) / 2 };
}

/** Кегль подписи: чем гуще сектора, тем мельче (§8.3). */
export function labelFontSize(count: number): number {
  return count > 10 ? 8 : count > 6 ? 9 : 10;
}

/**
 * Поворот подписи в градусах. В левой половине круга к нему добавляется 180°,
 * иначе текст читался бы вверх ногами.
 */
export function labelRotation(am: number): number {
  const deg = (am * 180) / Math.PI;
  return Math.cos(am) < 0 ? deg + 180 : deg;
}

/* ── Уровни (§8.1) ───────────────────────────────────────────────────────── */

/** Путь по колесу: `[]` — корень, `[cat]`, `[cat, sub]`. */
export type WheelPath = readonly string[];

export interface WheelItem {
  readonly id: string;
  readonly label: string;
  /** Тон и цветность всегда категорийные — глубина различается светлотой. */
  readonly h: number;
  readonly c: number;
  readonly l: number;
  /** Лист выбирается, остальное проваливается глубже. */
  readonly leaf: boolean;
}

/** Заливка сектора. Светлота печатается тремя знаками, как в прототипе. */
export function fillOf(item: WheelItem): string {
  return `oklch(${item.l.toFixed(3)} ${item.c} ${item.h})`;
}

/**
 * Сектора текущего уровня.
 *
 * Неизвестный id в пути не роняет экран, а откатывает его на уровень выше:
 * путь живёт в состоянии компонента и пережить может разве что горячую
 * перезагрузку, но падать на этом колесо не должно.
 */
export function wheelItems(path: WheelPath, lang: Lang, ws: WheelSet = BASE_WHEEL): WheelItem[] {
  const cat = path.length > 0 ? ws.cats.find((c) => c.id === path[0]) : undefined;

  if (!cat)
    return ws.cats.map((c, i) => ({
      id: c.id,
      label: c[lang],
      h: c.h,
      c: c.c,
      l: lightnessFor(0, i, ws.cats.length),
      leaf: false,
    }));

  const subs = (): WheelItem[] =>
    cat.sub.map((s, i) => ({
      id: s.id,
      label: s[lang],
      h: cat.h,
      c: cat.c,
      l: lightnessFor(1, i, cat.sub.length),
      leaf: false,
    }));

  if (path.length === 1) return subs();

  const sub = cat.sub.find((s) => s.id === path[1]);
  if (!sub) return subs();

  return sub.d.map((d, i) => ({
    id: d[0],
    label: lang === 'ru' ? d[1] : d[2],
    h: cat.h,
    c: cat.c,
    l: lightnessFor(2, i, sub.d.length),
    leaf: true,
  }));
}

/** Путь после тапа по сектору. Лист путь не меняет — он выбирается. */
export function pathInto(path: WheelPath, item: WheelItem): string[] {
  return item.leaf ? [...path] : [...path, item.id];
}

export function pathUp(path: WheelPath): string[] {
  return path.slice(0, -1);
}

/**
 * Уровень узла по его id: категория, подкатегория или лист.
 *
 * Нужен режимам, где уровень не задан путём (КАРТА, ПОЛОТНО, СПИСОК): там
 * тапают по любому кольцу, а панель правки должна знать, что предлагать —
 * «добавить подкатегорию», «добавить дескриптор» или ничего.
 *
 * `null` — id не из этого набора: скрытый правкой узел или запись из чужого
 * архива. Тогда добавлять внутрь нечего.
 */
export function nodeKindOf(id: string, ws: WheelSet = BASE_WHEEL): 'cat' | 'sub' | 'desc' | null {
  if (descById(id, ws)) return 'desc';
  for (const cat of ws.cats) {
    if (cat.id === id) return 'cat';
    for (const sub of cat.sub) if (sub.id === id) return 'sub';
  }
  return null;
}

/* ── Крошки и «добавить отсюда» (§8.6) ───────────────────────────────────── */

export interface Crumb {
  /** Ключ списка; у корня — `root`, дальше id уровня. */
  readonly key: string;
  readonly label: string;
  /** Последняя крошка — та, где человек стоит: она светлее остальных. */
  readonly current: boolean;
  /** Во сколько элементов обрезать путь при тапе. */
  readonly depth: number;
}

/** «ВСЁ / Фруктовое / Ягоды». Тап по любой возвращает на её уровень. */
export function crumbs(path: WheelPath, lang: Lang, ws: WheelSet = BASE_WHEEL): Crumb[] {
  return [
    {
      key: 'root',
      label: STR[lang].wheel_root,
      current: path.length === 0,
      depth: 0,
    },
    ...path.map((id, i) => ({
      key: id,
      label: nameOf(id, lang, ws),
      current: i === path.length - 1,
      depth: i + 1,
    })),
  ];
}

/**
 * Что предложит кнопка «+ <имя>»: id текущего уровня, если он ещё не выбран.
 * `null` — на корне или когда этот уровень уже в наборе.
 *
 * Смысл кнопки — README:59: остановиться можно на любом уровне, «фруктовое»
 * тоже ответ. Категория и подкатегория ложатся в запись такими же строками, как
 * листья, — `nameOf`/`hueOf` их знают.
 */
export function addHereTarget(path: WheelPath, picked: readonly Descriptor[]): string | null {
  const last = path[path.length - 1];
  if (last === undefined) return null;
  return picked.some(([id]) => id === last) ? null : last;
}

/* ── Память (§8.7) ───────────────────────────────────────────────────────── */

/**
 * Дескрипторы, которые уже выбирались, — объединение по всем **done**-записям.
 *
 * Только факт, без счётчиков: колесо подсказывает, где человек уже бывал, и не
 * превращается в рейтинг собственных привычек.
 */
export function memorySet(entries: readonly EntryRecord[]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    if (e.status !== 'done') continue;
    for (const [id] of e.desc) out.add(id);
  }
  return out;
}

/**
 * Есть ли у сектора отметка памяти.
 *
 * Лист сверяется сам с собой. Нелистовой — «внутри есть хоть один запомненный»:
 * обратные ссылки `desc.cat`/`desc.sub` дают ответ без обхода дерева.
 */
export function memoryHit(
  mem: ReadonlySet<string>,
  item: WheelItem,
  ws: WheelSet = BASE_WHEEL,
): boolean {
  if (mem.has(item.id)) return true;
  if (item.leaf) return false;
  for (const id of mem) {
    const d = descById(id, ws);
    if (d && (d.cat === item.id || d.sub === item.id)) return true;
  }
  return false;
}
