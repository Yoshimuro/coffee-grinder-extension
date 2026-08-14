/**
 * Сетап заваривания — единственное состояние, которое переживает переход между
 * экранами группы.
 *
 * Живёт в zustand, а не в состоянии `Brew.tsx`, по трём причинам:
 *   - таймер строит запись журнала из того же сетапа уже на другом экране;
 *   - конвертер отдаёт сюда центр диапазона («ВЗЯТЬ В ЗАВАРИВАНИЕ»), а деталь
 *     записи — весь набор параметров («ПОВТОРИТЬ»), и оба экрана чужие;
 *   - сетап не должен обнуляться от того, что пользователь ушёл на полку
 *     добавить пачку и вернулся.
 *
 * В базу он не пишется намеренно: это черновик одного заваривания, а не запись.
 * Схема v1 такой таблицы не знает, и заводить её ради черновика нельзя.
 */

import { create } from 'zustand';

import type { EntryRecord, Stage } from '../../../db/schema.js';
import type { Span } from '../../../domain/calibration.js';
import type { HybridMode } from '../../../domain/stages.js';

/** Числовые поля сетапа — те, что редактируются степперами. */
export type BrewField = 'grind' | 'dose' | 'water' | 'temp' | 'pours' | 'valveAt';

export interface BrewSetupValues {
  /** Id пачки. `null` — полка пуста, заваривать нечего. */
  bean: string | null;
  /** Id девайса. `null` допустим: `stagesFor` считает такое заваривание проливом. */
  device: string | null;
  hyMode: HybridMode;
  /** Настройка своей кофемолки. В запись уходит только для формы `beans`. */
  grind: number;
  dose: number;
  water: number;
  temp: number;
  pours: number;
  /** Секунда открытия клапана в режиме «СЕРЕДИНА». */
  valveAt: number;
  /**
   * Ответ конвертера, если сетап пришёл оттуда. Подсказка под помолом
   * показывает именно его; без него она считается по своей кофемолке.
   */
  span: Span | null;
  /**
   * Правленый план стадий (BJ-12). `null` — рецепт ещё авто и пересчитывается
   * из параметров при каждом их изменении.
   */
  recipe: Stage[] | null;
  /**
   * Тронут ли рецепт руками. Отдельный флаг, а не `recipe !== null`, потому что
   * «ВЕРНУТЬ АВТО» должно возвращать именно авто-пересчёт, а не последнюю копию.
   */
  recipeTouched: boolean;
}

/**
 * Значения прототипа (`DC:920`) с одной поправкой: пачка не выбрана заранее.
 * Прототип стартовал на демо-пачке `java`, а у настоящего первого запуска полка
 * пуста — экран выбирает первую пачку сам, когда она появляется.
 */
export const BREW_DEFAULTS: Readonly<BrewSetupValues> = Object.freeze({
  bean: null,
  device: null,
  hyMode: 'imm',
  grind: 4.6,
  dose: 15,
  water: 250,
  temp: 94,
  pours: 3,
  valveAt: 80,
  span: null,
  recipe: null,
  recipeTouched: false,
});

/**
 * Что обнуляет рецепт до авто: смена пачки, девайса, режима гибрида и приход
 * готового сетапа со стороны (README:38). Общий кусок патча — чтобы ни одна из
 * пяти точек про него не забыла.
 */
const AUTO_RECIPE = { recipe: null, recipeTouched: false } as const;

export interface BrewStore extends BrewSetupValues {
  setBean: (id: string | null) => void;
  setDevice: (id: string | null) => void;
  setHyMode: (mode: HybridMode) => void;
  setField: (field: BrewField, value: number) => void;
  /**
   * Приход с конвертера: помол встаёт в центр диапазона, а сам диапазон
   * остаётся подсказкой под полем (`ВЗЯТЬ В ЗАВАРИВАНИЕ`, `DC:1244`).
   */
  fromConverter: (span: Span) => void;
  /** «ПОВТОРИТЬ» с детали записи (`DC:1334`): параметры записи назад в сетап. */
  fromEntry: (entry: EntryRecord) => void;
  /**
   * Правка рецепта: мутатор получает копию текущего плана — авто-пересчёт, если
   * рецепт ещё не трогали, — и её результат становится рецептом.
   *
   * Копию собирает экран (он знает пачку и девайс, а стор — нет), поэтому сюда
   * приходит уже готовый список стадий.
   */
  setRecipe: (stages: Stage[]) => void;
  /** «ВЕРНУТЬ АВТО». */
  resetRecipe: () => void;
  reset: () => void;
}

export const useBrewSetup = create<BrewStore>((set) => ({
  ...BREW_DEFAULTS,

  setBean: (bean) => set({ bean, ...AUTO_RECIPE }),
  setDevice: (device) => set({ device, ...AUTO_RECIPE }),
  setHyMode: (hyMode) => set({ hyMode, ...AUTO_RECIPE }),
  // Вычисляемый ключ из объединения литералов TypeScript выводит как
  // `{ [x: string]: number }`, поэтому связь «поле ↔ тип значения» здесь может
  // выразить только утверждение. Все шесть полей числовые — врать оно не может.
  setField: (field, value) => set({ [field]: value } as Partial<BrewSetupValues>),

  fromConverter: (span) => set({ grind: span.center, span }),

  fromEntry: (entry) => set({ ...setupFromEntry(entry), ...AUTO_RECIPE }),

  setRecipe: (recipe) => set({ recipe, recipeTouched: true }),
  resetRecipe: () => set({ ...AUTO_RECIPE }),

  reset: () => set({ ...BREW_DEFAULTS }),
}));

/**
 * Разбор записи журнала обратно в сетап. Вынесен из стора, потому что это
 * чистое преобразование и оно проверяется тестом.
 *
 * Помол берётся, только если он в записи есть: у молотого и дрипа его нет, и
 * ноль вместо него сбил бы кофемолку. Гибрид опознаётся по `valveAt` — схема
 * пишет это поле ровно для режима «СЕРЕДИНА» (`DC:1027`), так что его наличие и
 * есть признак режима.
 */
export function setupFromEntry(entry: EntryRecord): Partial<BrewSetupValues> {
  const patch: Partial<BrewSetupValues> = {
    bean: entry.bean,
    device: entry.device,
    dose: entry.dose,
    water: entry.water,
    temp: entry.temp,
    // Диапазон конвертера к чужой записи отношения не имеет.
    span: null,
  };

  if (entry.grind !== null) patch.grind = entry.grind;
  if (entry.pours !== undefined) patch.pours = entry.pours;
  if (entry.valveAt !== undefined) {
    patch.valveAt = entry.valveAt;
    patch.hyMode = 'mid';
  }

  return patch;
}
