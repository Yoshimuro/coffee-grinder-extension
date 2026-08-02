/**
 * Построчное сравнение двух записей (component-report §9, `DC:1167-1190`).
 *
 * Сравнение строковое и после нормализации: `null`/`undefined` превращаются в
 * «—», и только потом значения сличаются. Значит «нет клапана» и «нет клапана»
 * — совпадение, а не два отсутствия, которые формально не равны.
 *
 * **Баг прототипа, который здесь исправлен.** `row(…, this.bean(a.bean).name …)`
 * (`DC:1174`) разыменовывал результат поиска пачки без проверки, а у записи
 * `mode: 'cup'` пачки нет вовсе (`DC:974`) — и чашки при этом доступны и в
 * фильтрах, и в списке, то есть выбрать их в сравнение можно было всегда. Здесь
 * пачка приходит уже разрешённой и может быть `null`; строка тогда — прочерк.
 *
 * Второе отличие: у чашки нет рецепта, поэтому её вес, вода, температура и
 * время — прочерки, а не нули из схемы. Ноль в колонке читался бы как «залили
 * 0 г воды», а это неправда: рецепта просто не было.
 *
 * Третье: диагностика показывается только у оценённых записей. Схема v1 держит
 * `diag` всегда, и у ждущей оценки записи там нули — «К 0 · Г 0» было бы
 * выдумкой (та же причина, по которой молчит `entryMark`).
 */

import { STR, modeName } from '../../../data/strings.js';
import { nameOf } from '../../../data/wheel.js';
import type { BeanRecord, DeviceRecord, EntryRecord, Lang } from '../../../db/schema.js';
import { fmtT } from '../../../domain/format.js';
import { deviceLabel } from '../../entry-format.js';
import { shortDate } from './format.js';
import { SCALES } from './diag-scales.js';

/** Одна строка сравнения. Цвет и насыщенность экран берёт из `diff`. */
export interface CompareRow {
  readonly label: string;
  readonly a: string;
  readonly b: string;
  /** Значения различаются — колонки становятся белыми и жирными. */
  readonly diff: boolean;
}

/** Запись вместе с уже разрешёнными ссылками. Обе ссылки могут отсутствовать. */
export interface CompareSide {
  readonly entry: EntryRecord;
  readonly bean?: BeanRecord | null | undefined;
  readonly device?: DeviceRecord | null | undefined;
}

/**
 * Нормализация значения колонки. `null`, `undefined` и пустая строка — прочерк.
 * Пустая строка добавлена к прототипу: заметки там не было, и `''` выводилась
 * пустым местом, которое ни на что не похоже.
 */
function cell(value: string | number | null | undefined, lang: Lang): string {
  if (value === null || value === undefined || value === '') return STR[lang].entry_none;
  return String(value);
}

/** Строка сравнения. Сличаются уже нормализованные строки (`DC:1173`). */
export function compareRow(
  label: string,
  va: string | number | null | undefined,
  vb: string | number | null | undefined,
  lang: Lang,
): CompareRow {
  const a = cell(va, lang);
  const b = cell(vb, lang);
  return { label, a, b, diff: a !== b };
}

/** У дегустации нет рецепта — все его поля показываются прочерком. */
function recipe<T>(entry: EntryRecord, value: T): T | null {
  return entry.mode === 'cup' ? null : value;
}

/** Диагностика показывается только у оценённой записи. */
function rated(entry: EntryRecord, value: number): number | null {
  return entry.status === 'done' ? value : null;
}

function descList(entry: EntryRecord, lang: Lang): string | null {
  if (entry.desc.length === 0) return null;
  return entry.desc.map(([id]) => nameOf(id, lang)).join(', ');
}

function beanName(side: CompareSide): string | null {
  return side.bean?.name ?? null;
}

/**
 * Пятнадцать строк в порядке §9. Порядок фиксирован: сверху то, что человек
 * выбирает (зерно, девайс, режим), затем то, что он крутит, затем то, что он
 * почувствовал.
 */
export function compareRows(a: CompareSide, b: CompareSide, lang: Lang): CompareRow[] {
  const t = STR[lang];
  const ea = a.entry;
  const eb = b.entry;
  const row = (
    label: string,
    va: string | number | null | undefined,
    vb: string | number | null | undefined,
  ): CompareRow => compareRow(label, va, vb, lang);

  const grams = (e: EntryRecord, value: number): string | null => {
    const v = recipe(e, value);
    return v === null ? null : `${v} ${t.grams}`;
  };

  return [
    row(t.log_bean, beanName(a), beanName(b)),
    row(t.log_device, deviceLabel(ea, lang, a.device), deviceLabel(eb, lang, b.device)),
    row(t.log_mode, modeLabel(ea, lang), modeLabel(eb, lang)),
    row(t.brew_grind, ea.grind, eb.grind),
    row(t.brew_dose, grams(ea, ea.dose), grams(eb, eb.dose)),
    row(t.brew_water, grams(ea, ea.water), grams(eb, eb.water)),
    row(t.brew_temp, tempLabel(ea, lang), tempLabel(eb, lang)),
    row(t.log_time, timeLabel(ea), timeLabel(eb)),
    row(t.brew_valve, valveLabel(ea), valveLabel(eb)),
    ...SCALES.map((s) =>
      row(t[s.label], rated(ea, ea.diag[s.key]), rated(eb, eb.diag[s.key])),
    ),
    row(t.log_desc, descList(ea, lang), descList(eb, lang)),
    row(t.log_note, ea.note, eb.note),
  ];
}

function modeLabel(entry: EntryRecord, lang: Lang): string {
  // Режим есть у любой записи, включая чашку: «Дегустация» — это ответ.
  return modeName(entry.mode, lang);
}

function tempLabel(entry: EntryRecord, lang: Lang): string | null {
  const v = recipe(entry, entry.temp);
  return v === null ? null : `${v}${STR[lang].deg}`;
}

function timeLabel(entry: EntryRecord): string | null {
  const v = recipe(entry, entry.total);
  // Ноль — «не засекал» у записи без таймера: в колонке это прочерк, а не 0:00.
  return v === null || v === 0 ? null : fmtT(v);
}

function valveLabel(entry: EntryRecord): string | null {
  return entry.valveAt === undefined ? null : fmtT(entry.valveAt);
}

/**
 * Подпись колонки: «A · 31.07 · 4.8» (`DC:1170`). Помол дописывается, только
 * если он у записи есть, — у молотого и дрипа его задал производитель.
 */
export function compareHeading(side: 'a' | 'b', entry: EntryRecord, lang: Lang): string {
  const letter = side === 'a' ? STR[lang].cmp_a : STR[lang].cmp_b;
  const head = `${letter} · ${shortDate(entry.date)}`;
  return entry.grind === null ? head : `${head} · ${entry.grind}`;
}
