/**
 * Настройки — типизированный доступ и живая подписка.
 *
 * Таблица key/value, поэтому «прочитать все настройки» — это `toArray()` плюс
 * сборка объекта. Собранный объект всегда полон: пока сид не отработал (а
 * `main.tsx` его не ждёт), экраны получают дефолты, а не `undefined`, и им не
 * нужно ветвиться на первый кадр.
 */

import { useLiveQuery } from 'dexie-react-hooks';

import {
  type BrewJournalDB,
  type Lang,
  type SettingKey,
  type SettingsValues,
  type ThemePref,
  db,
  getSetting,
  putSetting,
} from '../schema.js';

export { getSetting, putSetting };

/**
 * Дефолт настройки «ОТКУДА» — центр шкалы стартовой кофемолки конвертера
 * (0–60 у Comandante C40 MK4), то самое «30 кликов» с макета. Экран всё равно
 * зажимает значение по шкале выбранной молки, так что для любой другой оно
 * останется осмысленным.
 */
export const DEFAULT_CONV_VAL = 30;

/** Значения до первого запуска сида. Совпадают с тем, что пишет `seed()`. */
export const DEFAULT_SETTINGS: Readonly<SettingsValues> = Object.freeze({
  lang: 'ru',
  theme: 'dark',
  seeded: false,
  calib: { offset: 0, src: null },
  convFrom: null,
  convTo: null,
  convVal: DEFAULT_CONV_VAL,
  recents: [],
  hints: [],
  hintsOn: true,
});

/** Сколько кофемолок помнит конвертер (BJ-3, «три последних, а не вся история»). */
export const RECENTS_LIMIT = 3;

/** Все настройки одним объектом, с подставленными дефолтами. */
export async function readSettings(database: BrewJournalDB = db): Promise<SettingsValues> {
  const rows = await database.settings.toArray();
  // Составные дефолты копируются, а не переиспользуются: `DEFAULT_SETTINGS`
  // заморожен только на верхнем уровне, и общий на все вызовы массив рано или
  // поздно кто-нибудь дополнит на месте.
  const out: SettingsValues = {
    ...DEFAULT_SETTINGS,
    calib: { ...DEFAULT_SETTINGS.calib },
    recents: [...DEFAULT_SETTINGS.recents],
    hints: [...DEFAULT_SETTINGS.hints],
  };

  // Строка таблицы — один тип с union-значением, и связь «ключ ↔ тип значения»
  // здесь может выразить только утверждение. Оно локализовано в этих двух
  // строках; наружу выходит уже честный `SettingsValues`.
  const sink = out as unknown as Record<SettingKey, unknown>;
  for (const row of rows) sink[row.key] = row.value;

  return out;
}

/** Живые настройки. До первого ответа базы — дефолты, не `undefined`. */
export function useSettings(): SettingsValues {
  return useLiveQuery(() => readSettings(), [], DEFAULT_SETTINGS);
}

/** Одна настройка. Дефолт из `DEFAULT_SETTINGS`, пока база не ответила. */
export function useSetting<K extends SettingKey>(key: K): SettingsValues[K] {
  const value = useLiveQuery(() => getSetting(key), [key]);
  return value === undefined ? DEFAULT_SETTINGS[key] : value;
}

/** Язык интерфейса. Отдельным хуком — его дёргает почти каждый компонент. */
export function useLang(): Lang {
  return useSetting('lang');
}

/**
 * Ключ синхронного зеркала темы.
 *
 * `localStorage` — единственное хранилище, которое можно прочитать до первого
 * кадра; IndexedDB отвечает асинхронно и всегда опаздывает. Зеркало читает
 * инлайн-скрипт в `index.html`, а пишет — `setTheme()` ниже и восстанавливающий
 * эффект в `ui/theme.ts` (он же чинит зеркало после импорта архива, в котором
 * ключа `theme` не было).
 *
 * Значение здесь дублируется в `index.html` строкой, которую TypeScript не
 * видит. Их расхождение ловит `tests/unit/theme.test.ts` — это единственное,
 * что держит две копии вместе.
 */
export const THEME_MIRROR_KEY = 'bj-theme';

/** Пишет зеркало. Приватный режим кидается на `setItem` — там просто тихо. */
export function writeThemeMirror(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, pref);
  } catch {
    /* приватный режим или запрет хранилища: остаёмся на умолчании */
  }
}

/** Выбранная тема. `system` — как есть, разрешать её дело `ui/theme.ts`. */
export function useTheme(): ThemePref {
  return useSetting('theme');
}

/**
 * Меняет тему. Пишет базу и зеркало разом, чтобы они не могли разъехаться:
 * зеркало опережает базу ровно на один холодный старт, и если обновлять его
 * отдельно, то забытый вызов проявится как «тема откатилась после перезапуска».
 */
export async function setTheme(
  pref: ThemePref,
  database: BrewJournalDB = db,
): Promise<void> {
  writeThemeMirror(pref);
  await putSetting('theme', pref, database);
}

/* ── Подсказки первого входа (BJ-10) ─────────────────────────────────────── */

/** Показанные подсказки. До ответа базы — пустой список, а не `undefined`. */
export function useShownHints(): string[] {
  return useSetting('hints');
}

/** Включены ли подсказки. */
export function useHintsOn(): boolean {
  return useSetting('hintsOn');
}

/**
 * Помечает подсказку показанной.
 *
 * Транзакцией и без дублей — по той же причине, что и `pushRecent`: список
 * читается и пишется двумя действиями подряд, а между ними успевает пройти
 * следующий тап по цепочке.
 */
export async function markHint(id: string, database: BrewJournalDB = db): Promise<string[]> {
  return database.transaction('rw', database.settings, async () => {
    const current = (await getSetting('hints', database)) ?? [];
    if (current.includes(id)) return current;
    const next = [...current, id];
    await putSetting('hints', next, database);
    return next;
  });
}

/** «ПОКАЗАТЬ ЗАНОВО»: забыть показанное и включить подсказки обратно. */
export async function resetHints(database: BrewJournalDB = db): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    await putSetting('hints', [], database);
    await putSetting('hintsOn', true, database);
  });
}

/** Выключатель: кнопка «СКРЫТЬ ПОДСКАЗКИ» и чипы в настройках. */
export async function setHintsOn(on: boolean, database: BrewJournalDB = db): Promise<void> {
  await putSetting('hintsOn', on, database);
}

/**
 * Дописывает кофемолку в начало списка недавних, без дублей и не длиннее
 * `RECENTS_LIMIT`.
 */
export async function pushRecent(id: string, database: BrewJournalDB = db): Promise<string[]> {
  return database.transaction('rw', database.settings, async () => {
    const current = (await getSetting('recents', database)) ?? [];
    const next = [id, ...current.filter((x) => x !== id)].slice(0, RECENTS_LIMIT);
    await putSetting('recents', next, database);
    return next;
  });
}
