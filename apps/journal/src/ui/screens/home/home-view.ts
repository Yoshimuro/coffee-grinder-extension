/**
 * Домашний экран — строки карточки «оценка ждёт» и ленты (§10.4, `DC:1225`).
 *
 * Чистые функции, потому что «сегодня» здесь — не украшение, а смысл: дата
 * заваривания сравнивается с текущей, и это единственное место в приложении,
 * где строка меняется от того, какой сейчас день. Тест обязан задавать оба дня
 * сам, иначе он был бы зелёным ровно сутки.
 */

import { STR } from '../../../data/strings.js';
import type { EntryRecord, Lang } from '../../../db/schema.js';
import { shortDate } from '../../bean-format.js';
import { entryTitle, type EntryRefs } from '../../entry-format.js';

const SEP = ' · ';

/** Сколько записей показывает лента (`feedRows`, `DC:1230`). */
export const FEED_SIZE = 5;

/**
 * Заголовок ждущей записи: `Ява Золотая · V60 · 4.4` (`pendingTitle`,
 * `DC:1225`).
 *
 * Помол дописывается только когда он есть: у молотого и дрипа его нет, и «· 0»
 * читалось бы как настройка кофемолки, которой не было.
 */
export function pendingTitle(entry: EntryRecord, lang: Lang, refs?: EntryRefs): string {
  const title = entryTitle(entry, lang, refs);
  return entry.grind === null ? title : `${title}${SEP}${String(entry.grind)}`;
}

/**
 * Когда заварено: `сегодня · 09:12` или `31.07 · 08:47` (`pendingWhen`,
 * `DC:1225`).
 *
 * «Сегодня» вместо даты — не сокращение ради красоты: карточка существует,
 * чтобы напомнить про чашку, которая ещё стоит рядом, и «сегодня» отвечает на
 * вопрос «эта или вчерашняя» быстрее, чем число.
 */
export function pendingWhen(entry: EntryRecord, lang: Lang, today: string): string {
  const day = entry.date === today ? STR[lang].home_today : shortDate(entry.date);
  return `${day}${SEP}${entry.time}`;
}

/** Дата в шапке: `01.08.2026`. Формат прототипа (`todayLine`, `DC:1216`). */
export function todayLine(today: string): string {
  return `${shortDate(today)}.${today.slice(0, 4)}`;
}

/**
 * Лента: пять последних записей (`DC:1230`).
 *
 * Репозиторий уже отдаёт журнал новыми вперёд, поэтому здесь только срез — и
 * он же граница между «домом» и «журналом»: за шестой записью человек идёт во
 * вкладку, а не листает главный экран.
 */
export function feedEntries(entries: readonly EntryRecord[] | undefined): EntryRecord[] {
  return (entries ?? []).slice(0, FEED_SIZE);
}
