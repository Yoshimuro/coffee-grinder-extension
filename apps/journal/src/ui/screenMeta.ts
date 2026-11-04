/**
 * Screen titles and tab labels.
 *
 * Russian only for now; the strings are lifted from the prototype's `STR.ru`
 * (`data.js`) so the wording is the designed wording rather than a translation.
 * `bean`, `timer` and `detail` have no dedicated key there — their headers are
 * built from content the stubs do not have yet — so those three carry the
 * obvious label until BJ-4 gives them real headers.
 *
 * The full RU/EN string table lands in BJ-3 (`data/strings/*`); this map is
 * deliberately not it.
 *
 * Подписи табов — исключение: они с самого начала лежат в общей таблице
 * (`nav_*`), поэтому здесь только соответствие «таб → ключ» и функция, которая
 * достаёт строку на текущем языке. Хардкод по-русски стоил QA-7 (эмуляторный
 * прогон BJ-7: интерфейс переключался на EN, нижняя панель — нет).
 */

import type { Screen, Tab } from '../app/nav.js';
import { STR, type StrKey } from '../data/strings.js';
import type { Lang } from '../db/schema.js';

export const SCREEN_TITLES: Record<Screen, string> = {
  home: 'главный',
  conv: 'конвертер помола',
  shelf: 'полка',
  bean: 'пачка',
  beanAdd: 'добавить пачку',
  devices: 'устройства',
  device: 'настройка устройства',
  brew: 'заваривание',
  timer: 'таймер',
  rateLater: 'оценка позже',
  diag: 'оценка чашки',
  wheel: 'колесо вкусов',
  log: 'журнал',
  detail: 'запись',
  compare: 'сравнение',
  more: 'настройки',
  spec: 'спецификация',
};

/** Ключ подписи для каждого таба. Строки живут в `STR`, а не здесь. */
export const TAB_LABEL_KEYS: Record<Tab, StrKey> = {
  home: 'nav_home',
  shelf: 'nav_shelf',
  log: 'nav_log',
  more: 'nav_more',
};

/** Подпись таба на текущем языке. */
export function tabLabel(tab: Tab, lang: Lang): string {
  return STR[lang][TAB_LABEL_KEYS[tab]];
}
