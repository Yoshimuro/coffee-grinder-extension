/**
 * Форматы, которые нужны только экранам журнала.
 *
 * Всё, что показывает больше одного экрана вне группы, живёт в
 * `ui/entry-format.ts` и `domain/format.ts`; здесь — две мелочи, которых там
 * нет и которые незачем тянуть в общий слой.
 */

import { STR } from '../../../data/strings.js';
import type { EntryRecord, Lang } from '../../../db/schema.js';

/** `DD.MM` из ISO-даты (`fd`, `DC:951`). Строку не разбираем в `Date`. */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** Шапка детали: `DD.MM · HH:MM`. */
export function entryStamp(entry: EntryRecord): string {
  return `${shortDate(entry.date)} · ${entry.time}`;
}

/**
 * Контекст в правом углу диагностики: что именно сейчас оценивают (`DC:1305`).
 * Помол дописывается, только если он у записи есть.
 */
export function rateContext(title: string, grind: number | null): string {
  return grind === null ? title : `${title} · ${grind}`;
}

/** Пометка «ждёт оценки» показывается вместо оценки, а не рядом с ней. */
export function isPending(entry: EntryRecord): boolean {
  return entry.status !== 'done';
}

/** `N г` или пусто — вода стадии в списке детали (`DC:1334`). */
export function stageWater(water: number, lang: Lang): string {
  return water ? `${water} ${STR[lang].grams}` : '';
}
