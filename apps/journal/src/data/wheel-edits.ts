/**
 * Правки колеса — пользовательский слой поверх неизменяемой базы (`WHEEL`).
 *
 * Модель «база + оверлей»: база живёт в коде и обновляется релизами, правки —
 * маленькие операции, которые накладываются на неё при каждой сборке набора.
 * Так обновление базы (новые встроенные дескрипторы) не конфликтует с уже
 * сделанными правками — снапшот всего дерева конфликтовал бы.
 *
 * Контракт тот же, что у базы: id — append-only. Поэтому:
 *   - `rename` меняет только подписи, id не трогается никогда;
 *   - `hide` убирает узел из колеса, но не из истории — `nameOf`/`hueOf`
 *     откатываются на базу и продолжают знать скрытые встроенные id;
 *   - пользовательские id чеканятся с префиксом {@link CUSTOM_PREFIX}, чтобы
 *     будущий встроенный id не столкнулся с уже существующим пользовательским.
 *
 * Кривая правка (неизвестная цель, занятый id) молча пропускается: список
 * правок — данные из хранилища, и падать на них колесо не должно — ровно как
 * `wheelItems` не падает на неизвестном пути.
 */

import {
  BASE_WHEEL,
  WHEEL,
  type WheelCategory,
  type WheelSet,
  buildDesc,
} from './wheel.js';

/** Префикс пользовательских id: `u-liqueur`, `u-liqueur-2`, … */
export const CUSTOM_PREFIX = 'u-';

/**
 * Одна правка. Порядок в списке значим: подкатегорию можно добавить в только
 * что добавленную категорию, дескриптор — в только что добавленную
 * подкатегорию.
 */
export type WheelEdit =
  | {
      readonly op: 'add-cat';
      readonly id: string;
      readonly ru: string;
      readonly en: string;
      /** Тон и цветность oklch — как у встроенных категорий. */
      readonly h: number;
      readonly c: number;
    }
  | {
      readonly op: 'add-sub';
      readonly id: string;
      /** Категория-родитель — встроенная или добавленная раньше по списку. */
      readonly cat: string;
      readonly ru: string;
      readonly en: string;
    }
  | {
      readonly op: 'add-desc';
      readonly id: string;
      /** Подкатегория-родитель; id подкатегорий глобально уникальны. */
      readonly sub: string;
      readonly ru: string;
      readonly en: string;
    }
  | { readonly op: 'rename'; readonly target: string; readonly ru: string; readonly en: string }
  | { readonly op: 'hide'; readonly target: string };

/* Черновик — то же дерево, но мутабельное: правки применяются на месте, а
   наружу результат уходит уже под readonly-типом базы. */
interface DraftSub {
  id: string;
  ru: string;
  en: string;
  d: [string, string, string][];
}

interface DraftCat {
  id: string;
  ru: string;
  en: string;
  h: number;
  c: number;
  sub: DraftSub[];
}

/** Занят ли id на любом из трёх уровней дерева. */
export function hasWheelId(cats: readonly WheelCategory[], id: string): boolean {
  for (const c of cats) {
    if (c.id === id) return true;
    for (const s of c.sub) {
      if (s.id === id) return true;
      for (const d of s.d) if (d[0] === id) return true;
    }
  }
  return false;
}

function apply(draft: DraftCat[], e: WheelEdit): void {
  switch (e.op) {
    case 'add-cat': {
      if (hasWheelId(draft, e.id)) return;
      draft.push({ id: e.id, ru: e.ru, en: e.en, h: e.h, c: e.c, sub: [] });
      return;
    }
    case 'add-sub': {
      if (hasWheelId(draft, e.id)) return;
      const cat = draft.find((c) => c.id === e.cat);
      if (cat) cat.sub.push({ id: e.id, ru: e.ru, en: e.en, d: [] });
      return;
    }
    case 'add-desc': {
      if (hasWheelId(draft, e.id)) return;
      for (const c of draft) {
        const sub = c.sub.find((s) => s.id === e.sub);
        if (sub) {
          sub.d.push([e.id, e.ru, e.en]);
          return;
        }
      }
      return;
    }
    case 'rename': {
      for (const c of draft) {
        if (c.id === e.target) {
          c.ru = e.ru;
          c.en = e.en;
          return;
        }
        for (const s of c.sub) {
          if (s.id === e.target) {
            s.ru = e.ru;
            s.en = e.en;
            return;
          }
          const d = s.d.find((x) => x[0] === e.target);
          if (d) {
            d[1] = e.ru;
            d[2] = e.en;
            return;
          }
        }
      }
      return;
    }
    case 'hide': {
      for (const c of draft) {
        for (const s of c.sub) {
          const di = s.d.findIndex((x) => x[0] === e.target);
          if (di >= 0) {
            s.d.splice(di, 1);
            return;
          }
        }
        const si = c.sub.findIndex((s) => s.id === e.target);
        if (si >= 0) {
          c.sub.splice(si, 1);
          return;
        }
      }
      const ci = draft.findIndex((c) => c.id === e.target);
      if (ci >= 0) draft.splice(ci, 1);
      return;
    }
  }
}

/**
 * Накладывает правки на базу и возвращает новое дерево. База не мутируется:
 * черновик — глубокая копия, и каждый вызов независим.
 */
export function composeWheel(
  base: readonly WheelCategory[],
  edits: readonly WheelEdit[],
): readonly WheelCategory[] {
  const draft: DraftCat[] = base.map((c) => ({
    id: c.id,
    ru: c.ru,
    en: c.en,
    h: c.h,
    c: c.c,
    sub: c.sub.map((s) => ({
      id: s.id,
      ru: s.ru,
      en: s.en,
      d: s.d.map(([id, ru, en]): [string, string, string] => [id, ru, en]),
    })),
  }));

  for (const e of edits) apply(draft, e);
  return draft;
}

/** Дерево вместе с плоской проекцией — то, что ждут функции `wheel.ts`. */
export function makeWheelSet(
  cats: readonly WheelCategory[],
  fallback: WheelSet = BASE_WHEEL,
): WheelSet {
  return Object.freeze({ cats, desc: buildDesc(cats), fallback });
}

/**
 * Эффективное колесо: правки поверх базы, двумя наборами.
 *
 * Показывается «effective» — с применёнными скрытиями. Его fallback — «full»,
 * тот же список правок без единого `hide`: там живут имена и цвета скрытых
 * узлов, в том числе пользовательских, которых база не знает. Так старая
 * запись со скрытым дескриптором остаётся подписанной и цветной, а
 * переименованный и затем скрытый узел зовётся новым именем.
 */
export function effectiveWheelSet(edits: readonly WheelEdit[]): WheelSet {
  if (edits.length === 0) return BASE_WHEEL;
  const full = makeWheelSet(composeWheel(WHEEL, edits.filter((e) => e.op !== 'hide')));
  return makeWheelSet(composeWheel(WHEEL, edits), full);
}
