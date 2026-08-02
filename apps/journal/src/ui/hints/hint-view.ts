/**
 * Подсказки — вся арифметика слоя одной пачкой чистых функций.
 *
 * Здесь нет ни React, ни DOM: какая цепочка активна, куда её обрезать, каким
 * прямоугольником вырезать зону и с какой стороны поставить карточку — всё это
 * правила продукта, и проверяются они тестом, а не глазами по экрану. Слой
 * `HintLayer.tsx` только меряет реальные элементы и раскладывает результат.
 */

import type { Screen } from '../../app/nav.js';
import { HINTS, type Hint } from '../../data/hints.js';

/** Отступ выреза от зоны, px. Подсветка обязана дышать. */
export const HOLE_PAD = 6;

/** Зазор между вырезом и карточкой, px. */
export const CARD_GAP = 12;

/**
 * Насколько высоко над низом окна стоит карточка, поставленная «сверху».
 *
 * Ниже — полоса «СКРЫТЬ ПОДСКАЗКИ»: тач-таргет 48px, безопасная зона снизу
 * (до 34px на телефонах с жестовой навигацией) и зазор. Числом, а не
 * измерением: полоса рисуется тем же кадром, что и карточка, и мерить её было
 * бы нечем.
 */
export const MIN_ABOVE = 100;

/**
 * Сколько места карточка занимает: две строки текста плюс подвал со счётчиком.
 *
 * Оценка, а не измерение, и это осознанно: сторона выбирается до отрисовки, а
 * измерить ещё не нарисованную карточку нечем. Ошибка в меньшую сторону здесь
 * дороже — она вернула бы карточку под нижнюю полосу.
 */
export const CARD_ROOM = 132;

/** Прямоугольник в координатах окна. Подмножество `DOMRect`. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Подсказки экрана в порядке реестра. */
export function hintsForScreen(screen: Screen): Hint[] {
  return HINTS.filter((h) => h.screen === screen);
}

/**
 * Что ещё не показано на этом экране.
 *
 * Выключенные подсказки не отдают ничего — так слой не считает зоны и не
 * ставит таймеры там, где показывать всё равно нечего.
 */
export function pendingHints(
  screen: Screen,
  shown: readonly string[],
  on: boolean,
): Hint[] {
  if (!on) return [];
  const seen = new Set(shown);
  return hintsForScreen(screen).filter((h) => !seen.has(h.id));
}

/**
 * Вырез вокруг зоны: расширенный на {@link HOLE_PAD} и зажатый окном.
 *
 * Зажим нужен для зон у самого края — у кнопки во всю ширину экрана вырез иначе
 * уехал бы за границу, и тень, которой рисуется затемнение, оставила бы светлую
 * полосу вдоль края.
 */
export function holeBox(rect: Box, view: Viewport, pad: number = HOLE_PAD): Box {
  const left = Math.max(0, rect.left - pad);
  const top = Math.max(0, rect.top - pad);
  const right = Math.min(view.width, rect.left + rect.width + pad);
  const bottom = Math.min(view.height, rect.top + rect.height + pad);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/**
 * С какой стороны от выреза встаёт карточка.
 *
 * Правило простое: под зоной, если под ней есть место, иначе над ней. По
 * середине экрана решать нельзя — высокая зона (кольцо колеса вкусов занимает
 * две трети экрана) серединой попадает в верхнюю половину, а места под собой
 * не оставляет вовсе, и карточка уезжает под нижнюю полосу.
 *
 * Позиция задаётся `top` либо `bottom` от края окна: так высоту карточки знать
 * не нужно, а нужную оценку места даёт {@link CARD_ROOM}.
 */
export interface CardAnchor {
  side: 'below' | 'above';
  /** Значение CSS-свойства `top` (для `below`) или `bottom` (для `above`), px. */
  offset: number;
}

export function cardAnchor(hole: Box, view: Viewport, gap: number = CARD_GAP): CardAnchor {
  const below = Math.round(hole.top + hole.height + gap);
  if (view.height - MIN_ABOVE - below >= CARD_ROOM) return { side: 'below', offset: below };

  /* Сверху: не ниже полосы «СКРЫТЬ ПОДСКАЗКИ» и не выше края экрана — зона
     высотой во весь экран иначе вытолкнула бы карточку за верхнюю границу. */
  const above = Math.round(view.height - hole.top + gap);
  return {
    side: 'above',
    offset: Math.min(Math.max(MIN_ABOVE, above), view.height - CARD_ROOM),
  };
}

/** Зона видима, если она вообще что-то занимает на экране. */
export function isVisibleBox(rect: Box | null): boolean {
  return rect !== null && rect.width > 0 && rect.height > 0;
}

/** Счётчик шагов: «2 / 3». Цепочка короче двух шагов счётчика не получает. */
export function stepCounter(at: number, total: number): string {
  return total > 1 ? `${String(at + 1)} / ${String(total)}` : '';
}
