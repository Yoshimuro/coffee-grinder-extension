/**
 * Лента фильтров журнала (component-report §10.7, `DC:1164-1165`).
 *
 * Предикат и ключ чипа живут в `db/repo/entries.ts` — они нужны и запросу к
 * базе. Здесь только состав ленты и подписи: «ВСЁ», затем пачки с полки, затем
 * пять режимов.
 *
 * Подписи режимов взяты отдельными ключами, а не из `modeName`: чип называет
 * отбор, а не запись. «ЧАШКИ» — это множество дегустаций, «ДРИП» — все
 * заваривания из пакетов; `modeName` дал бы «Дегустация» и «ДРИП-ПАКЕТ»,
 * которые в ленту не влезают и читаются как одна запись.
 */

import { STR, type StrKey } from '../../../data/strings.js';
import { ALL_ENTRIES, type LogFilter, chipLabel } from '../../../db/repo/entries.js';
import type { BeanRecord, BrewMode, Lang } from '../../../db/schema.js';

/** Режимы в порядке ленты (`DC:1164`). */
export const FILTER_MODES: readonly BrewMode[] = ['perc', 'imm', 'hybrid', 'drip', 'cup'];

const MODE_LABEL: Readonly<Record<BrewMode, StrKey>> = {
  perc: 'log_f_perc',
  imm: 'log_f_imm',
  hybrid: 'log_f_hybrid',
  drip: 'log_f_drip',
  cup: 'log_f_cup',
};

/**
 * Состав ленты: «ВСЁ» + пачка на каждую строку полки + пять режимов.
 *
 * Пачки идут перед режимами и в порядке полки — человек чаще ищет «ту самую
 * пачку», чем «все проливы».
 */
export function logFilters(beans: readonly BeanRecord[]): LogFilter[] {
  return [
    ALL_ENTRIES,
    ...beans.map((b): LogFilter => ({ kind: 'bean', bean: b.id })),
    ...FILTER_MODES.map((mode): LogFilter => ({ kind: 'mode', mode })),
  ];
}

/**
 * Подпись чипа. Пачка ищется по id: если её удалили, а фильтр остался, чип
 * называется прочерком, а не пустотой.
 */
export function filterLabel(
  filter: LogFilter,
  lang: Lang,
  beans: readonly BeanRecord[],
): string {
  if (filter.kind === 'all') return STR[lang].log_all;
  if (filter.kind === 'mode') return STR[lang][MODE_LABEL[filter.mode]];

  const bean = beans.find((b) => b.id === filter.bean);
  return bean?.name ? chipLabel(bean.name) : STR[lang].entry_none;
}
