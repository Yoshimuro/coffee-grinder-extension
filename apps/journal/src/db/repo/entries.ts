/**
 * Журнал — доступ к таблице `entries`.
 *
 * Схема v1 индексирует `date`, но не время, поэтому «новые сверху» досортирова-
 * ется в памяти по `date`, `time` и `id`. Журнал одного человека — сотни строк,
 * а не миллионы; составной индекс ради этого в замороженную схему не просится.
 */

import { useLiveQuery } from 'dexie-react-hooks';

import { decrementBean } from '../../domain/timer.js';
import type { BeanRecord, BrewJournalDB, BrewMode, EntryRecord } from '../schema.js';
import { db } from '../schema.js';

/* ── Фильтры журнала ─────────────────────────────────────────────────────── */

/**
 * Фильтр ленты (component-report §10.7). В прототипе это была одна строка
 * (`'all' | 'm-<mode>' | <beanId>`), из-за чего пачка с id `m-…` сломала бы
 * разбор. Здесь размеченное объединение, а строковый ключ остаётся только
 * идентификатором чипа.
 */
export type LogFilter =
  | { kind: 'all' }
  | { kind: 'mode'; mode: BrewMode }
  | { kind: 'bean'; bean: string };

export const ALL_ENTRIES: LogFilter = { kind: 'all' };

/** Ключ чипа: `all`, `m-perc`, либо id пачки — ровно как в прототипе. */
export function filterKey(filter: LogFilter): string {
  if (filter.kind === 'all') return 'all';
  if (filter.kind === 'mode') return `m-${filter.mode}`;
  return filter.bean;
}

export function matchesFilter(entry: EntryRecord, filter: LogFilter): boolean {
  if (filter.kind === 'all') return true;
  if (filter.kind === 'mode') return entry.mode === filter.mode;
  return entry.bean === filter.bean;
}

/** Подпись пачки на чипе: обрезается по ` ·` и ` (` (`DC:1164`). */
export function chipLabel(name: string): string {
  const [head = name] = name.split(' ·');
  const [short = head] = head.split(' (');
  return short;
}

/* ── Чтение ──────────────────────────────────────────────────────────────── */

/** Новые сверху. Стабильно: при равных дате и времени решает id. */
export function byNewest(a: EntryRecord, b: EntryRecord): number {
  return b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.id.localeCompare(a.id);
}

export async function listEntries(
  filter: LogFilter = ALL_ENTRIES,
  database: BrewJournalDB = db,
): Promise<EntryRecord[]> {
  const rows =
    filter.kind === 'bean'
      ? await database.entries.where('bean').equals(filter.bean).toArray()
      : filter.kind === 'mode'
        ? await database.entries.where('mode').equals(filter.mode).toArray()
        : await database.entries.toArray();
  return rows.sort(byNewest);
}

export async function getEntry(
  id: string | null | undefined,
  database: BrewJournalDB = db,
): Promise<EntryRecord | undefined> {
  if (!id) return undefined;
  return database.entries.get(id);
}

/** Заваривания одной пачки, новые сверху — список на карточке пачки. */
export async function listEntriesForBean(
  beanId: string,
  database: BrewJournalDB = db,
): Promise<EntryRecord[]> {
  return listEntries({ kind: 'bean', bean: beanId }, database);
}

/**
 * Запись, которая ждёт оценки, — карточка на главном экране (`DC:1148`).
 * Самая свежая из ждущих: прототип брал первую в журнале, а журнал хранился
 * новыми вперёд.
 */
export async function findPendingEntry(
  database: BrewJournalDB = db,
): Promise<EntryRecord | undefined> {
  const rows = await database.entries.where('status').equals('pending').toArray();
  return rows.sort(byNewest)[0];
}

/* ── Запись ──────────────────────────────────────────────────────────────── */

export async function putEntry(entry: EntryRecord, database: BrewJournalDB = db): Promise<string> {
  return database.entries.put(entry);
}

/**
 * Патч записи по id — на этом стоит сохранение диагностики (`saveDiag`,
 * `DC:1034`). Возвращает обновлённую запись или `undefined`, если её уже нет.
 */
export async function updateEntry(
  id: string,
  patch: Partial<Omit<EntryRecord, 'id'>>,
  database: BrewJournalDB = db,
): Promise<EntryRecord | undefined> {
  return database.transaction('rw', database.entries, async () => {
    const current = await database.entries.get(id);
    if (!current) return undefined;
    const next: EntryRecord = { ...current, ...patch };
    await database.entries.put(next);
    return next;
  });
}

export async function deleteEntry(id: string, database: BrewJournalDB = db): Promise<void> {
  await database.entries.delete(id);
}

export interface SavedEntry {
  entry: EntryRecord;
  /** Пачка после списания. `null`, если записи не за что было списывать. */
  bean: BeanRecord | null;
}

/**
 * Сохраняет заваривание и списывает остаток пачки одной транзакцией (AC-3).
 *
 * ВАЖНО для вызывающих: сюда идёт пачка **до** списания — та, что лежит на
 * полке. `makeEntry()` из домена возвращает свою, уже списанную копию; её
 * передавать нельзя, иначе доза уйдёт дважды. Внутри транзакции пачка ещё раз
 * перечитывается из базы, поэтому параллельное заваривание не потеряет грамм.
 *
 * Списание — `decrementBean` из `domain/timer.ts`: дрип теряет пакетик, зерно и
 * молотый — дозу записи, обе величины зажаты нулём.
 */
export async function saveEntryWithDecrement(
  entry: EntryRecord,
  bean: BeanRecord | null,
  database: BrewJournalDB = db,
): Promise<SavedEntry> {
  return database.transaction('rw', database.entries, database.beans, async () => {
    await database.entries.put(entry);
    if (!bean) return { entry, bean: null };

    const stored = (await database.beans.get(bean.id)) ?? bean;
    const next = decrementBean(stored, entry.dose);
    await database.beans.put(next);
    return { entry, bean: next };
  });
}

/* ── Хуки ────────────────────────────────────────────────────────────────── */

/** Живая лента журнала. `undefined` — база ещё не ответила. */
export function useEntries(filter: LogFilter = ALL_ENTRIES): EntryRecord[] | undefined {
  const key = filterKey(filter);
  return useLiveQuery(() => listEntries(filter), [key]);
}

export function useEntry(id: string | null | undefined): EntryRecord | undefined {
  return useLiveQuery(() => getEntry(id), [id]);
}

export function useEntriesForBean(beanId: string | null | undefined): EntryRecord[] | undefined {
  return useLiveQuery(() => (beanId ? listEntriesForBean(beanId) : Promise.resolve([])), [beanId]);
}

/** Карточка «оценка ждёт» на главном. `undefined` — нет такой записи. */
export function usePendingEntry(): EntryRecord | undefined {
  return useLiveQuery(() => findPendingEntry(), []);
}

/* ── Прочее ──────────────────────────────────────────────────────────────── */

/** Идентификатор новой записи. Формат прототипа (`DC:1025`). */
export function newEntryId(now: Date = new Date()): string {
  return `j${now.getTime()}`;
}

/** Запись дегустации «вне журнала» (`openTaste`, `DC:972`). */
export function makeCupEntry(input: {
  id?: string;
  date: string;
  time: string;
  diag: EntryRecord['diag'];
}): EntryRecord {
  return {
    id: input.id ?? newEntryId(),
    date: input.date,
    time: input.time,
    bean: null,
    device: null,
    devName: '',
    mode: 'cup',
    grind: null,
    dose: 0,
    water: 0,
    temp: 0,
    total: 0,
    stages: [],
    status: 'pending',
    diag: { ...input.diag },
    desc: [],
    note: '',
  };
}
