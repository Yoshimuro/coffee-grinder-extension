/**
 * Рецепт-подсказка — редактор плана стадий на сетапе (BJ-12).
 *
 * Отдельный модуль, а не часть `brew-view.ts`: здесь другая тема — не «какое
 * поле когда видно», а «что человек сделал с планом». Всё чистое: экран отдаёт
 * список стадий и получает новый, тест проверяет числа.
 *
 * Три правила, которые стоит знать, прежде чем править:
 *
 * 1. **Авто, пока не тронут.** Нетронутый рецепт — это результат `stagesFor` от
 *    текущих параметров: он пересчитывается сам. Первое же изменение делает
 *    копию, и с этого момента параметры сетапа на стадии не влияют (README:37).
 * 2. **В редакторе видно не всё.** Дренаж автоматический, а отметки нулевой
 *    длительности (`РАЗМЕШАТЬ`, `ОТКРЫТЬ КЛАПАН`) не длятся — крутить в них
 *    нечего. Из плана они не исчезают: таймер получает стадии целиком.
 * 3. **Имя — только у первой строки.** Дальше идут проливы, как бы они ни
 *    назывались внутри: человек правит объём и время, а не тип стадии.
 */

import { STR, stageName } from '../../../data/strings.js';
import type { Lang, Stage, StageKey } from '../../../db/schema.js';
import { fmtT } from '../../../domain/format.js';
import { plannedTotal, plannedWater } from '../../../domain/stages.js';

const SEP = ' · ';

/** Шаг степпера длительности — ±5 с (README:29). */
export const RECIPE_DUR_STEP = 5;

/** Шаг степпера воды — ±10 г (README:30). */
export const RECIPE_WATER_STEP = 10;

/** Что вставляет `+ ПРОЛИВ` (README:32). */
export const NEW_POUR: Stage = ['pour', 30, 50];

/** Стадии, в которые льют. У остальных вместо степпера воды прочерк. */
const WATER_KEYS: readonly StageKey[] = ['bloom', 'pour', 'steep'];

export function stageTakesWater(key: StageKey): boolean {
  return WATER_KEYS.includes(key);
}

/**
 * Видна ли стадия в редакторе.
 *
 * Дренаж — служебная стадия: он случается сам, и его длительность человек не
 * назначает, а наблюдает. Отметка нулевой длительности не длится вовсе.
 */
export function isEditableStage(stage: Stage): boolean {
  if (stage[0] === 'drain') return false;
  return stageTakesWater(stage[0]) || stage[1] > 0;
}

export interface RecipeRow {
  /** Позиция в **полном** плане: степперы правят именно её. */
  readonly index: number;
  readonly name: string;
  /** `0:45`. */
  readonly dur: string;
  /** `150 г`; `null` — стадия без воды, в слоте прочерк. */
  readonly water: string | null;
  /** Единственную видимую строку удалять нельзя: рецепт не бывает пустым. */
  readonly canRemove: boolean;
}

/**
 * Строки редактора. Первая сохраняет своё имя (СМАЧИВАНИЕ, НАСТАИВАНИЕ), все
 * следующие подписаны ПРОЛИВ.
 */
export function recipeRows(stages: readonly Stage[], lang: Lang): RecipeRow[] {
  const t = STR[lang];
  const visible = stages
    .map((stage, index) => ({ stage, index }))
    .filter(({ stage }) => isEditableStage(stage));

  return visible.map(({ stage, index }, position) => ({
    index,
    name: position === 0 ? stageName(stage[0], lang) : t.t_pour,
    dur: fmtT(stage[1]),
    water: stageTakesWater(stage[0]) ? `${stage[2]} ${t.grams}` : null,
    canRemove: visible.length > 1,
  }));
}

/** Копия плана с изменённой длительностью стадии. Ниже нуля не уходит. */
export function bumpStageDuration(
  stages: readonly Stage[],
  index: number,
  delta: number,
): Stage[] {
  return stages.map((stage, i) =>
    i === index ? [stage[0], Math.max(0, stage[1] + delta), stage[2]] : [...stage],
  );
}

/** То же для воды. */
export function bumpStageWater(stages: readonly Stage[], index: number, delta: number): Stage[] {
  return stages.map((stage, i) =>
    i === index ? [stage[0], stage[1], Math.max(0, stage[2] + delta)] : [...stage],
  );
}

export function removeStage(stages: readonly Stage[], index: number): Stage[] {
  return stages.filter((_, i) => i !== index).map((stage) => [...stage] as Stage);
}

/**
 * Новый пролив встаёт **перед хвостовым дренажом**: дренаж закрывает
 * заваривание, и лить после него некуда.
 */
export function addPour(stages: readonly Stage[]): Stage[] {
  let at = stages.length;
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    if (stage && stage[0] === 'drain') at = i;
    else break;
  }
  const next = stages.map((stage) => [...stage] as Stage);
  next.splice(at, 0, [...NEW_POUR]);
  return next;
}

/** `итого 3:05 · 250 г`. */
export function recipeTotalLine(stages: readonly Stage[], lang: Lang): string {
  const t = STR[lang];
  return `${t.rec_total} ${fmtT(plannedTotal(stages))}${SEP}${plannedWater(stages)} ${t.grams}`;
}

/**
 * `в рецепте 240 г из 250` — тихая заметка, а не ошибка: расхождение бывает
 * осмысленным (часть воды долили мимо стадий), и запрещать его незачем.
 * `null` — суммы сошлись, говорить не о чем.
 */
export function recipeWaterNote(
  stages: readonly Stage[],
  water: number,
  lang: Lang,
): string | null {
  const t = STR[lang];
  const inRecipe = plannedWater(stages);
  if (inRecipe === water) return null;
  return `${t.rec_holds} ${inRecipe} ${t.grams} ${t.t_of} ${water}`;
}

/**
 * Секунда открытия клапана по рецепту — длительность стадии перед отметкой
 * `ОТКРЫТЬ КЛАПАН`.
 *
 * Нужна записи журнала: в режиме «СЕРЕДИНА» поле `valveAt` и есть та самая
 * стадия настаивания, и если человек её поправил, запись обязана назвать
 * поправленное число, а не забытое значение степпера (решение по BJ-12).
 */
export function recipeValveAt(stages: readonly Stage[], fallback: number): number {
  const at = stages.findIndex((stage) => stage[0] === 'valve');
  if (at <= 0) return fallback;
  return stages[at - 1]?.[1] ?? fallback;
}
