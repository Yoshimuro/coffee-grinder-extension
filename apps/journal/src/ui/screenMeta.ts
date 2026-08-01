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
 */

import type { Screen, Tab } from '../app/nav.js';

export const SCREEN_TITLES: Record<Screen, string> = {
  home: 'ГЛАВНЫЙ',
  conv: 'КОНВЕРТЕР ПОМОЛА',
  shelf: 'ПОЛКА',
  bean: 'ПАЧКА',
  beanAdd: 'ДОБАВИТЬ ПАЧКУ',
  devices: 'ДЕВАЙСЫ',
  device: 'КОНСТРУКТОР',
  brew: 'ЗАВАРИВАНИЕ',
  timer: 'ТАЙМЕР',
  rateLater: 'ОЦЕНКА ПОЗЖЕ',
  diag: 'ДИАГНОСТИКА',
  wheel: 'КОЛЕСО ВКУСОВ',
  log: 'ЖУРНАЛ',
  detail: 'ЗАПИСЬ',
  compare: 'СРАВНЕНИЕ',
  more: 'НАСТРОЙКИ',
  spec: 'СПЕЦИФИКАЦИЯ',
};

export const TAB_LABELS: Record<Tab, string> = {
  home: 'ГЛАВНЫЙ',
  shelf: 'ПОЛКА',
  log: 'ЖУРНАЛ',
  more: 'ЕЩЁ',
};
