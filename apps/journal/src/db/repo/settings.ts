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
  db,
  getSetting,
  putSetting,
} from '../schema.js';

export { getSetting, putSetting };

/** Значения до первого запуска сида. Совпадают с тем, что пишет `seed()`. */
export const DEFAULT_SETTINGS: Readonly<SettingsValues> = Object.freeze({
  lang: 'ru',
  seeded: false,
  calib: { offset: 0, src: null },
  convFrom: null,
  convTo: null,
  recents: [],
});

/** Сколько кофемолок помнит конвертер (BJ-3, «три последних, а не вся история»). */
export const RECENTS_LIMIT = 3;

/** Все настройки одним объектом, с подставленными дефолтами. */
export async function readSettings(database: BrewJournalDB = db): Promise<SettingsValues> {
  const rows = await database.settings.toArray();
  const out: SettingsValues = { ...DEFAULT_SETTINGS, calib: { ...DEFAULT_SETTINGS.calib } };

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
