/**
 * Полка — доступ к таблице `beans`.
 *
 * Порядок везде один: как заведено, старые сверху. Идентификаторы вида
 * `b<timestamp>` делают первичный ключ и порядок добавления одним и тем же
 * порядком, поэтому `toArray()` уже отсортирован и лишняя сортировка не нужна.
 */

import { useLiveQuery } from 'dexie-react-hooks';

import type { BeanForm, BeanRecord, BrewJournalDB } from '../schema.js';
import { db } from '../schema.js';

/** Идентификатор новой пачки. Формат прототипа (`DC:1268`). */
export function newBeanId(now: Date = new Date()): string {
  return `b${now.getTime()}`;
}

export async function listBeans(database: BrewJournalDB = db): Promise<BeanRecord[]> {
  return database.beans.toArray();
}

export async function listBeansByForm(
  form: BeanForm,
  database: BrewJournalDB = db,
): Promise<BeanRecord[]> {
  return database.beans.where('form').equals(form).toArray();
}

export async function getBean(
  id: string | null | undefined,
  database: BrewJournalDB = db,
): Promise<BeanRecord | undefined> {
  if (!id) return undefined;
  return database.beans.get(id);
}

export async function putBean(bean: BeanRecord, database: BrewJournalDB = db): Promise<string> {
  return database.beans.put(bean);
}

/**
 * Удаляет пачку. Записи журнала не трогает: они денормализованы ровно для
 * этого — история переживает уборку на полке (D-3 спеки).
 */
export async function deleteBean(id: string, database: BrewJournalDB = db): Promise<void> {
  await database.beans.delete(id);
}

/** Живая полка. `undefined` — база ещё не ответила. */
export function useBeans(): BeanRecord[] | undefined {
  return useLiveQuery(() => listBeans(), []);
}

/** Живая пачка по id. `null`/`undefined` в аргументе — запрос не делается. */
export function useBean(id: string | null | undefined): BeanRecord | undefined {
  return useLiveQuery(() => getBean(id), [id]);
}
