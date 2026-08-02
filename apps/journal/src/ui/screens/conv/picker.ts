/**
 * Модель строк пикера «ОТКУДА» — порт поведения пикера расширения
 * (`extension-report` §5, `src/ui/grinder-picker.ts`).
 *
 * Каталог — 134 записи: плоским списком это стена, поэтому пустой запрос
 * показывает недавние и схлопнутые бренды, а любой ввод переключает на плоский
 * результат поиска. Поиск — `searchGrinders` ядра (все термы через пробел
 * должны совпасть по бренду, модели и алиасам), не своя реализация подстроки:
 * прототип искал только по `name` и не находил «1z jx».
 *
 * Здесь только данные. Раскладка, клавиатура и фокус — в `GrinderPicker.tsx`.
 */

import {
  type Grinder,
  allGrinders,
  displayName,
  grinderById,
  groupByBrand,
  searchGrinders,
} from '@coffee/core';

/** Сколько недавних показывать. Совпадает с `RECENTS_LIMIT` репозитория. */
export const RECENTS_SHOWN = 3;

export type PickerRow =
  /** Заголовок секции «НЕДАВНИЕ». */
  | { kind: 'label'; key: string; text: string }
  /** Схлопнутый бренд: тумблер со счётчиком моделей. */
  | { kind: 'brand'; key: string; brand: string; count: number; open: boolean }
  /** Кофемолка. `indent` — внутри раскрытого бренда. */
  | { kind: 'grinder'; key: string; grinder: Grinder; selected: boolean; indent: boolean }
  /** Запрос не совпал ни с чем. */
  | { kind: 'empty'; key: string; text: string };

export interface PickerInput {
  /** Строка поиска как её ввёл пользователь. */
  query: string;
  /** Недавние id, свежие первыми. Из настроек. */
  recents: readonly string[];
  /** Что сейчас выбрано в «ОТКУДА». */
  selected: string | null;
  /** Раскрытые бренды. При каждом открытии панели список пуст. */
  expanded: ReadonlySet<string>;
  /** Заголовок секции недавних — готовая строка из `strings.ts`. */
  recentLabel: string;
  /** Строка «ничего не найдено». */
  emptyLabel: string;
}

/** Название кофемолки в строке пикера. Тонкая обёртка над ядром. */
export function rowName(grinder: Grinder): string {
  return displayName(grinder);
}

/**
 * Недавние для показа: разрешённые по каталогу, без текущего выбора и не
 * длиннее `RECENTS_SHOWN`.
 *
 * Текущий выбор выбрасывается намеренно — строка «недавняя: то, что и так
 * выбрано» не даёт ни одного нового перехода. Расширение по этой же причине
 * держало историю из 5, чтобы после выброса гарантированно осталось 3; здесь
 * репозиторий хранит ровно 3, так что иногда останется 2 (см. отчёт G5).
 */
export function recentGrinders(
  recents: readonly string[],
  selected: string | null,
): Grinder[] {
  const out: Grinder[] = [];
  for (const id of recents) {
    if (id === selected) continue;
    const g = grinderById(id);
    if (g === undefined) continue;
    if (out.some((x) => x.id === g.id)) continue;
    out.push(g);
    if (out.length === RECENTS_SHOWN) break;
  }
  return out;
}

/** Есть ли в запросе хоть один непробельный символ. */
export function hasQuery(query: string): boolean {
  return query.trim().length > 0;
}

/**
 * Строки панели.
 *
 * Непустой запрос — плоский список результатов, без секций: они мешают, когда
 * пользователь уже знает, что ищет. Пустой — недавние, затем по строке на
 * бренд, а модели только у раскрытых.
 */
export function pickerRows(input: PickerInput): PickerRow[] {
  const { query, recents, selected, expanded } = input;

  if (hasQuery(query)) {
    const found = searchGrinders(query);
    if (found.length === 0) return [{ kind: 'empty', key: 'empty', text: input.emptyLabel }];
    return found.map((grinder) => ({
      kind: 'grinder',
      key: `f-${grinder.id}`,
      grinder,
      selected: grinder.id === selected,
      indent: false,
    }));
  }

  const rows: PickerRow[] = [];

  const recent = recentGrinders(recents, selected);
  if (recent.length > 0) {
    rows.push({ kind: 'label', key: 'recent', text: input.recentLabel });
    for (const grinder of recent) {
      rows.push({
        kind: 'grinder',
        key: `r-${grinder.id}`,
        grinder,
        selected: grinder.id === selected,
        indent: false,
      });
    }
  }

  for (const [brand, models] of groupByBrand(allGrinders())) {
    const open = expanded.has(brand);
    rows.push({ kind: 'brand', key: `b-${brand}`, brand, count: models.length, open });
    if (!open) continue;
    for (const grinder of models) {
      rows.push({
        kind: 'grinder',
        key: `g-${grinder.id}`,
        grinder,
        selected: grinder.id === selected,
        indent: true,
      });
    }
  }

  return rows;
}

/** Раскрыть/схлопнуть бренд. Новое множество — состояние React не мутируем. */
export function toggleBrand(expanded: ReadonlySet<string>, brand: string): Set<string> {
  const next = new Set(expanded);
  if (!next.delete(brand)) next.add(brand);
  return next;
}
