import { afterEach, describe, expect, it } from 'vitest';

import {
  ALL_ENTRIES,
  DEFAULT_CONV_VAL,
  chipLabel,
  deleteGrinder,
  filterKey,
  findPendingEntry,
  getBean,
  getDevice,
  listBeans,
  listEntries,
  listEntriesForBean,
  listGrinders,
  matchesFilter,
  putBean,
  putDevice,
  putGrinder,
  pushRecent,
  readSettings,
  saveEntryWithDecrement,
  updateEntry,
} from '../../src/db/repo/index.js';
import { BrewJournalDB, getSetting, putSetting } from '../../src/db/schema.js';
import type { BeanRecord, DeviceRecord, EntryRecord, GrinderRecord } from '../../src/db/schema.js';

let open: BrewJournalDB[] = [];

function freshDb(): BrewJournalDB {
  const database = new BrewJournalDB(`brew-journal-repo-${crypto.randomUUID()}`);
  open.push(database);
  return database;
}

afterEach(async () => {
  for (const database of open) database.close();
  for (const database of open) await database.delete();
  open = [];
});

const BEANS: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 30,
};

const DRIP: BeanRecord = {
  id: 'drip',
  form: 'drip',
  name: 'Дрип · Колумбия Уила',
  roast: '2026-07-10',
  photos: [],
  count: 5,
  leftCount: 1,
  dose: 12,
};

const V60: DeviceRecord = {
  id: 'v60',
  name: 'Hario V60-02',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};

function entry(patch: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'j1',
    date: '2026-08-01',
    time: '09:12',
    bean: 'java',
    device: 'v60',
    devName: 'Hario V60-02',
    mode: 'perc',
    grind: 4.4,
    dose: 15,
    water: 250,
    temp: 94,
    total: 168,
    stages: [['bloom', 45, 45]],
    status: 'done',
    diag: { acid: 5, bitter: 4, body: 6, balance: 6 },
    desc: [],
    note: '',
    ...patch,
  };
}

function grinder(id: string): GrinderRecord {
  return {
    id,
    name: id.toUpperCase(),
    micronsPerStep: 10,
    zeroOffsetMicrons: 300,
    scale: { min: 0, max: 40, step: 1, unit: 'click' },
  };
}

describe('saveEntryWithDecrement', () => {
  it('пишет запись и списывает дозу с зерна', async () => {
    const db = freshDb();
    await putBean(BEANS, db);

    const saved = await saveEntryWithDecrement(entry({ dose: 15 }), BEANS, db);

    expect(saved.bean?.left).toBe(15);
    expect((await getBean('java', db))?.left).toBe(15);
    expect((await listEntries(ALL_ENTRIES, db)).map((e) => e.id)).toEqual(['j1']);
  });

  it('у дрипа списывает пакетик, а не граммы', async () => {
    const db = freshDb();
    await putBean(DRIP, db);

    const saved = await saveEntryWithDecrement(
      entry({ id: 'j2', bean: 'drip', mode: 'drip', device: null, devName: '', dose: 12 }),
      DRIP,
      db,
    );

    expect(saved.bean?.leftCount).toBe(0);
    expect(saved.bean?.left).toBeUndefined();
  });

  it('зажимает остаток нулём, а не уводит в минус', async () => {
    const db = freshDb();
    await putBean(BEANS, db);

    await saveEntryWithDecrement(entry({ dose: 45 }), BEANS, db);
    expect((await getBean('java', db))?.left).toBe(0);

    await saveEntryWithDecrement(entry({ id: 'j2', dose: 15 }), BEANS, db);
    expect((await getBean('java', db))?.left).toBe(0);
  });

  it('списывает от того, что лежит в базе, а не от копии экрана', async () => {
    const db = freshDb();
    await putBean(BEANS, db);
    // Экран держит устаревшую пачку: пока он был открыт, заварили ещё раз.
    await putBean({ ...BEANS, left: 20 }, db);

    const saved = await saveEntryWithDecrement(entry({ dose: 15 }), BEANS, db);

    expect(saved.bean?.left).toBe(5);
  });

  it('без пачки — просто запись: у дегустации списывать нечего', async () => {
    const db = freshDb();

    const saved = await saveEntryWithDecrement(
      entry({ id: 'j3', mode: 'cup', bean: null, device: null, devName: '', status: 'pending' }),
      null,
      db,
    );

    expect(saved.bean).toBeNull();
    expect(await db.beans.count()).toBe(0);
    expect((await findPendingEntry(db))?.id).toBe('j3');
  });
});

describe('журнал', () => {
  it('отдаёт новые сверху и фильтрует по пачке и режиму', async () => {
    const db = freshDb();
    await db.entries.bulkPut([
      entry({ id: 'a', date: '2026-07-30', time: '09:05' }),
      entry({ id: 'b', date: '2026-08-01', time: '09:12' }),
      entry({ id: 'c', date: '2026-08-01', time: '01:30', bean: 'drip', mode: 'drip' }),
    ]);

    expect((await listEntries(ALL_ENTRIES, db)).map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect((await listEntries({ kind: 'bean', bean: 'drip' }, db)).map((e) => e.id)).toEqual(['c']);
    expect((await listEntries({ kind: 'mode', mode: 'perc' }, db)).map((e) => e.id)).toEqual([
      'b',
      'a',
    ]);
    expect((await listEntriesForBean('java', db)).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('берёт самую свежую из ждущих оценки', async () => {
    const db = freshDb();
    await db.entries.bulkPut([
      entry({ id: 'old', date: '2026-07-30', status: 'pending' }),
      entry({ id: 'new', date: '2026-08-01', status: 'pending' }),
      entry({ id: 'done', date: '2026-08-02' }),
    ]);

    expect((await findPendingEntry(db))?.id).toBe('new');
  });

  it('патчит запись, не трогая остального', async () => {
    const db = freshDb();
    await db.entries.put(entry({ status: 'pending' }));

    const next = await updateEntry('j1', { status: 'done', note: 'ровнее' }, db);

    expect(next?.status).toBe('done');
    expect(next?.note).toBe('ровнее');
    expect(next?.grind).toBe(4.4);
    expect(await updateEntry('нет такой', { note: 'x' }, db)).toBeUndefined();
  });

  it('ключи и предикат фильтра совпадают с прототипом', () => {
    expect(filterKey(ALL_ENTRIES)).toBe('all');
    expect(filterKey({ kind: 'mode', mode: 'hybrid' })).toBe('m-hybrid');
    expect(filterKey({ kind: 'bean', bean: 'java' })).toBe('java');

    expect(matchesFilter(entry(), ALL_ENTRIES)).toBe(true);
    expect(matchesFilter(entry(), { kind: 'mode', mode: 'imm' })).toBe(false);
    expect(matchesFilter(entry(), { kind: 'bean', bean: 'java' })).toBe(true);
  });

  it('обрезает подпись пачки на чипе по « ·» и « (»', () => {
    expect(chipLabel('Дрип · Колумбия Уила')).toBe('Дрип');
    expect(chipLabel('Кения Ньери (вашд)')).toBe('Кения Ньери');
    expect(chipLabel('Ява Золотая')).toBe('Ява Золотая');
  });
});

describe('полка и девайсы', () => {
  it('читает пачки и девайсы по id, не спотыкаясь о null', async () => {
    const db = freshDb();
    await putBean(BEANS, db);
    await putDevice(V60, db);

    expect((await listBeans(db)).map((b) => b.id)).toEqual(['java']);
    expect((await getBean('java', db))?.name).toBe('Ява Золотая');
    expect(await getBean(null, db)).toBeUndefined();
    expect((await getDevice('v60', db))?.flow).toBe('perc');
    expect(await getDevice(undefined, db)).toBeUndefined();
  });
});

describe('свои кофемолки', () => {
  it('не отдаёт последнюю — иначе конвертеру некуда пересчитывать', async () => {
    const db = freshDb();
    await putGrinder(grinder('g1'), db);

    expect(await deleteGrinder('g1', db)).toBe('last');
    expect(await listGrinders(db)).toHaveLength(1);
    expect(await deleteGrinder('нет такой', db)).toBe('missing');
  });

  it('переводит выбор конвертера на оставшуюся', async () => {
    const db = freshDb();
    await putGrinder(grinder('g1'), db);
    await putGrinder(grinder('g2'), db);
    await putSetting('convTo', 'g2', db);
    await putSetting('convFrom', 'g1', db);
    await pushRecent('g2', db);

    expect(await deleteGrinder('g2', db)).toBe('ok');

    expect(await getSetting('convTo', db)).toBe('g1');
    expect(await getSetting('convFrom', db)).toBe('g1');
    expect(await getSetting('recents', db)).toEqual([]);
  });
});

describe('настройки', () => {
  it('подставляет дефолты, пока сид не отработал', async () => {
    const db = freshDb();

    expect(await readSettings(db)).toEqual({
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
  });

  /* Составные дефолты обязаны копироваться: общий на все вызовы массив рано или
     поздно кто-нибудь дополнит на месте, и «показанные подсказки» протекут в
     чистую базу. */
  it('отдаёт свои копии составных дефолтов, а не общие', async () => {
    const db = freshDb();
    const first = await readSettings(db);
    first.hints.push('h-home-brew');
    first.recents.push('x');

    const second = await readSettings(db);
    expect(second.hints).toEqual([]);
    expect(second.recents).toEqual([]);
  });

  it('складывает записанное поверх дефолтов', async () => {
    const db = freshDb();
    await putSetting('lang', 'en', db);
    await putSetting('calib', { offset: -2, src: 'j1' }, db);

    const settings = await readSettings(db);
    expect(settings.lang).toBe('en');
    expect(settings.calib).toEqual({ offset: -2, src: 'j1' });
    expect(settings.recents).toEqual([]);
  });

  it('помнит три последние кофемолки без дублей', async () => {
    const db = freshDb();

    await pushRecent('a', db);
    await pushRecent('b', db);
    await pushRecent('a', db);
    await pushRecent('c', db);
    expect(await pushRecent('d', db)).toEqual(['d', 'c', 'a']);
  });
});
