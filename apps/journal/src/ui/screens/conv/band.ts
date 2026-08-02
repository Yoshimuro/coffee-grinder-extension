/**
 * Геометрия полосы-шкалы под главным результатом (`DC:1150`, `DC:1243`).
 *
 * Полоса отвечает на вопрос «а где этот диапазон на шкале моей молки» — поэтому
 * окно считается от верхней границы ответа, а не от `scale.max`. Молка с
 * диапазоном 0–120 щелчков ужала бы ответ 3.2–6.0 в невидимую чёрточку у левого
 * края; окно `hi * 1.4` оставляет диапазон читаемым и всё равно показывает, что
 * запас справа есть.
 *
 * Нижняя граница окна — 8: у шкалы 0–9 (Timemore) окно 1.4 от единицы выглядело
 * бы как «упёрлись в край», хотя до края далеко.
 *
 * Функция чистая и в проценты уже зажатая: `applyCalib` может сдвинуть ответ за
 * ноль, а отрицательный `left` в CSS вылезет за плашку.
 */

/** Точки диапазона на шкале целевой кофемолки. */
export interface BandSpan {
  lo: number;
  center: number;
  hi: number;
}

/** Готовые к подстановке в CSS проценты плюс подпись правого края. */
export interface BandGeometry {
  /** Правая подпись шкалы. Левая всегда `0`. */
  win: number;
  /** Левый край заливки, %. */
  left: number;
  /** Ширина заливки, %. Никогда не отрицательная. */
  width: number;
  /** Позиция засечки центра, %. */
  center: number;
}

/** Минимальное окно шкалы. Прототип: `Math.max(8, …)`. */
export const MIN_WINDOW = 8;

function pct(value: number, win: number): number {
  return Math.min(100, Math.max(0, (value / win) * 100));
}

export function bandGeometry(span: BandSpan): BandGeometry {
  const win = Math.max(MIN_WINDOW, Math.ceil(span.hi * 1.4));
  const left = pct(span.lo, win);
  const right = pct(span.hi, win);

  return {
    win,
    left,
    width: Math.max(0, right - left),
    center: pct(span.center, win),
  };
}
