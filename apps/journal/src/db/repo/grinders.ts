/**
 * Свои кофемолки — доступ к таблице `grinders`.
 *
 * «Свои» здесь буквально: каталог из 134 молок живёт в `@coffee/core` и в базу
 * не копируется. В таблице только то, что пользователь держит в руках, и хотя
 * бы одна запись обязана остаться — иначе конвертеру некуда пересчитывать
 * (component-report §10.8).
 */

import { useLiveQuery } from 'dexie-react-hooks';

import type { BrewJournalDB, GrinderRecord } from '../schema.js';
import { db, getSetting, putSetting } from '../schema.js';

/** Идентификатор своей кофемолки. Формат прототипа (`DC:1345`). */
export function newGrinderId(now: Date = new Date()): string {
  return `g${now.getTime()}`;
}

export async function listGrinders(database: BrewJournalDB = db): Promise<GrinderRecord[]> {
  return database.grinders.toArray();
}

export async function getGrinder(
  id: string | null | undefined,
  database: BrewJournalDB = db,
): Promise<GrinderRecord | undefined> {
  if (!id) return undefined;
  return database.grinders.get(id);
}

export async function putGrinder(
  grinder: GrinderRecord,
  database: BrewJournalDB = db,
): Promise<string> {
  return database.grinders.put(grinder);
}

/** Почему удаление не состоялось. `ok` — состоялось. */
export type GrinderDeleteResult = 'ok' | 'last' | 'missing';

/**
 * Удаляет свою кофемолку (`DC:1339-1340`).
 *
 * Последнюю не отдаёт: пустой список кофемолок — это сломанный конвертер и
 * сломанный сетап заваривания. Если удаляемая была выбрана в конвертере, выбор
 * переезжает на первую оставшуюся — иначе экран показал бы несуществующее.
 */
export async function deleteGrinder(
  id: string,
  database: BrewJournalDB = db,
): Promise<GrinderDeleteResult> {
  return database.transaction('rw', database.grinders, database.settings, async () => {
    const all = await database.grinders.toArray();
    if (!all.some((g) => g.id === id)) return 'missing';
    if (all.length < 2) return 'last';

    await database.grinders.delete(id);
    const rest = all.filter((g) => g.id !== id);
    const fallback = rest[0]?.id ?? null;

    for (const key of ['convFrom', 'convTo'] as const) {
      if ((await getSetting(key, database)) === id) await putSetting(key, fallback, database);
    }

    const recents = (await getSetting('recents', database)) ?? [];
    if (recents.includes(id))
      await putSetting(
        'recents',
        recents.filter((x) => x !== id),
        database,
      );

    return 'ok';
  });
}

/** Живой список своих кофемолок. `undefined` — база ещё не ответила. */
export function useOwnGrinders(): GrinderRecord[] | undefined {
  return useLiveQuery(() => listGrinders(), []);
}

export function useGrinder(id: string | null | undefined): GrinderRecord | undefined {
  return useLiveQuery(() => getGrinder(id), [id]);
}
