/**
 * QR рецепта — контракт №3 задачи BJ-6.
 *
 * Что это такое. Запись журнала — история одного заваривания на одном
 * устройстве; QR — рецепт, который читают чужой камерой. Поэтому в payload не
 * уезжает ни один внутренний id (D-3): пачка называется именем, девайс не
 * называется вовсе — на чужой кухне он всё равно другой, а режим заваривания
 * сохранён полем `mode`.
 *
 * Стадии — плановые, а не записанные. Записанные содержат паузы и фактические
 * длительности этого конкретного пролива («43 секунды, потому что отвлёкся»);
 * повторять их бессмысленно. План строится ровно тем же путём, что и кнопка
 * «ПОВТОРИТЬ» рядом: `setupFromEntry` → `brewPlan` → `stagesFor`, поэтому QR и
 * повтор гарантированно дают один и тот же рецепт.
 *
 * Бюджет. Версия QR растёт с длиной строки, а вместе с ней — плотность модулей;
 * на экране телефона очень плотный код перестаёт читаться чужой камерой.
 * {@link QR_BUDGET} держит payload в разумной версии, а если рецепт всё равно
 * не влезает — первыми уходят стадии: без них рецепт остаётся рецептом
 * (помол, доза, вода, температура), а без дозы — нет.
 */

import type { BeanRecord, BrewMode, DeviceRecord, EntryRecord, Stage } from '../../../db/schema.js';
import { stagesFor } from '../../../domain/stages.js';
import { BREW_DEFAULTS, setupFromEntry } from '../brewing/brew-store.js';
import { brewPlan } from '../brewing/brew-view.js';

/** Потолок длины payload в байтах UTF-8 (контракт №3). */
export const QR_BUDGET = 500;

/** Тело QR. Ключи короткие сознательно — каждый байт стоит модулей. */
export interface RecipePayload {
  v: 1;
  t: 'recipe';
  mode: BrewMode;
  /** Настройка своей кофемолки. `null` — помол задал производитель. */
  grind: number | null;
  /** Граммы. `null` — дозы у записи нет (дегустация). */
  dose: number | null;
  water: number;
  temp: number;
  pours?: number;
  valveAt?: number;
  /** Имя пачки, не id: рецепт должен читаться на чужом устройстве. */
  bean?: string;
  /** Плановые стадии `[ключ, секунды, граммы]`. Опускаются, если не влезли. */
  stages?: Stage[];
}

/** Длина строки в байтах UTF-8 — QR считает именно их, а не символы. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Плановые стадии записи.
 *
 * Без пачки плана нет: форма кофе (`beans`/`ground`/`drip`) — первое, на что
 * смотрит генератор, а восстановить её из записи нечем.
 */
export function plannedStages(
  entry: EntryRecord,
  bean: BeanRecord | null,
  device: DeviceRecord | null,
): Stage[] | undefined {
  if (!bean) return undefined;
  const values = { ...BREW_DEFAULTS, ...setupFromEntry(entry) };
  return stagesFor(brewPlan(values, bean, device));
}

/** Собирает payload. Стадии кладутся, только если переданы. */
export function recipePayload(
  entry: EntryRecord,
  bean: BeanRecord | null,
  device: DeviceRecord | null,
): RecipePayload {
  const payload: RecipePayload = {
    v: 1,
    t: 'recipe',
    mode: entry.mode,
    grind: entry.grind,
    dose: entry.dose > 0 ? entry.dose : null,
    water: entry.water,
    temp: entry.temp,
  };

  if (entry.pours !== undefined) payload.pours = entry.pours;
  if (entry.valveAt !== undefined) payload.valveAt = entry.valveAt;
  if (bean?.name) payload.bean = bean.name;

  const stages = plannedStages(entry, bean, device);
  if (stages && stages.length > 0) payload.stages = stages;

  return payload;
}

/**
 * Payload строкой, ужатый под бюджет.
 *
 * Ужимается ровно один раз и ровно одним способом — выбрасыванием стадий. Резать
 * дальше (округлять воду, обрезать имя пачки) значило бы отдать чужому телефону
 * не тот рецепт, и лучше вернуть длинную строку, чем неверную.
 */
export function encodeRecipe(payload: RecipePayload): string {
  const full = JSON.stringify(payload);
  if (byteLength(full) <= QR_BUDGET || payload.stages === undefined) return full;

  const { stages: _dropped, ...rest } = payload;
  return JSON.stringify(rest);
}

/** Готовая строка для кодировщика. */
export function recipeText(
  entry: EntryRecord,
  bean: BeanRecord | null,
  device: DeviceRecord | null,
): string {
  return encodeRecipe(recipePayload(entry, bean, device));
}

/**
 * Есть ли что кодировать.
 *
 * У дегустации рецепта нет вовсе — ни воды, ни дозы, ни стадий; QR с четырьмя
 * нулями был бы такой же ложью, как фейковый шум прототипа (D-12 задачи BJ-4).
 */
export function hasRecipe(entry: EntryRecord): boolean {
  return entry.mode !== 'cup' && entry.water > 0;
}

/* ── Отрисовка ───────────────────────────────────────────────────────────── */

/**
 * Матрица модулей в один SVG-путь.
 *
 * Один `<path>`, а не тысяча `<rect>`: на 45×45 модулей это разница между
 * двумя тысячами узлов DOM и одним. Каждый чёрный модуль добавляет замкнутый
 * подпуть `M x y h1 v1 h-1 z` в системе координат «один модуль = одна единица»,
 * поэтому масштабируется он `viewBox`, а не пересчётом чисел.
 */
export function modulesPath(matrix: readonly (readonly boolean[])[]): string {
  const parts: string[] = [];
  for (const [y, row] of matrix.entries())
    for (const [x, on] of row.entries()) {
      if (on) parts.push(`M${String(x)} ${String(y)}h1v1h-1z`);
    }
  return parts.join('');
}
