/**
 * Колесо списком — плоская проекция всех трёх уровней (BJ-12).
 *
 * Режим для тех, кому круг не нужен: категории секциями, подкатегории
 * подзаголовками, дескрипторы чипами. Ищется глазами и пальцем, а не
 * проваливанием вглубь.
 *
 * Цвета считаются здесь же, потому что они — данные, а не палитра: тон и
 * цветность приходят из категории, светлота у точки категории та же, что у её
 * сектора на карте (`lightnessFor`), а чип берёт общий цвет вкуса (`colOf`).
 */

import { type WheelSet, colOf, lightnessFor } from '../../../data/wheel.js';
import type { Lang } from '../../../db/schema.js';

export interface ListChip {
  readonly id: string;
  readonly label: string;
  /** Точка вкуса слева в чипе. */
  readonly dot: string;
  /** Рамка выбранного чипа — цветом вкуса; невыбранного — токеном (в CSS). */
  readonly border: string | null;
  readonly selected: boolean;
  readonly remembered: boolean;
}

export interface ListSub {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
  readonly chips: ListChip[];
}

export interface ListCat {
  readonly id: string;
  readonly label: string;
  readonly dot: string;
  readonly selected: boolean;
  /** Сколько листьев внутри — счётчик справа в заголовке секции. */
  readonly count: number;
  readonly subs: ListSub[];
}

export function wheelList(
  ws: WheelSet,
  lang: Lang,
  picked: ReadonlySet<string>,
  memory: ReadonlySet<string>,
): ListCat[] {
  return ws.cats.map((cat, ci) => ({
    id: cat.id,
    label: cat[lang],
    dot: `oklch(${lightnessFor(0, ci, ws.cats.length).toFixed(3)} ${cat.c} ${cat.h})`,
    selected: picked.has(cat.id),
    count: cat.sub.reduce((sum, sub) => sum + sub.d.length, 0),
    subs: cat.sub.map((sub) => ({
      id: sub.id,
      label: sub[lang],
      selected: picked.has(sub.id),
      chips: sub.d.map(([id, ru, en]) => ({
        id,
        label: lang === 'ru' ? ru : en,
        dot: colOf(id, undefined, ws),
        border: picked.has(id) ? colOf(id, 0.8, ws) : null,
        selected: picked.has(id),
        remembered: memory.has(id),
      })),
    })),
  }));
}
