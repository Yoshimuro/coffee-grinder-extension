import { afterEach, describe, expect, it } from 'vitest';

import { BrewJournalDB, getSetting, putSetting } from '../../src/db/schema.js';
import { findSeedGrinder, seed, toOwnGrinder } from '../../src/db/seed.js';

/** A throwaway database per test, so one test's rows never colour another's. */
let open: BrewJournalDB[] = [];

function freshDb(): BrewJournalDB {
  const database = new BrewJournalDB(`brew-journal-test-${crypto.randomUUID()}`);
  open.push(database);
  return database;
}

afterEach(async () => {
  // Close every connection before deleting any: the reopen test holds two
  // handles on the same name, and deleting under a live one makes Dexie warn.
  for (const database of open) database.close();
  for (const database of open) await database.delete();
  open = [];
});

describe('schema v1', () => {
  it('opens at version 1 with the five contracted tables', async () => {
    const db = freshDb();
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'beans',
      'devices',
      'entries',
      'grinders',
      'settings',
    ]);
  });

  it('indexes entries on date, status, bean and mode', async () => {
    const db = freshDb();
    await db.open();

    const entries = db.table('entries');
    expect(entries.schema.primKey.keyPath).toBe('id');
    expect(entries.schema.indexes.map((i) => i.name).sort()).toEqual([
      'bean',
      'date',
      'mode',
      'status',
    ]);

    expect(db.table('beans').schema.indexes.map((i) => i.name)).toEqual(['form']);
    expect(db.table('settings').schema.primKey.keyPath).toBe('key');
  });

  it('round-trips a brew entry, including the stage tuples', async () => {
    const db = freshDb();
    await db.entries.put({
      id: 'e1',
      date: '2026-08-02',
      time: '09:12',
      bean: 'java',
      device: 'v60',
      devName: 'Hario V60-02',
      mode: 'perc',
      grind: 4.6,
      dose: 15,
      water: 250,
      temp: 93,
      total: 186,
      stages: [
        ['bloom', 35, 45],
        ['pour', 40, 105],
        ['pause', 12, 105],
        ['drain', 99, 250],
      ],
      pours: 2,
      status: 'pending',
      diag: { acid: 5, bitter: 4, body: 6, balance: 7 },
      desc: [['citrus', 2]],
      note: '',
    });

    const stored = await db.entries.get('e1');
    expect(stored?.stages[2]).toEqual(['pause', 12, 105]);
    expect(await db.entries.where('status').equals('pending').count()).toBe(1);
  });

  it('reads and writes settings through the typed helpers', async () => {
    const db = freshDb();
    expect(await getSetting('lang', db)).toBeUndefined();

    await putSetting('calib', { offset: -2, src: 'e1' }, db);
    expect(await getSetting('calib', db)).toEqual({ offset: -2, src: 'e1' });
  });
});

describe('seed', () => {
  it('resolves the Timemore Chestnut S3 from the core catalogue', () => {
    const grinder = findSeedGrinder();
    expect(grinder).toBeDefined();
    expect(grinder?.brand).toBe('Timemore');
    expect(grinder?.model).toBe('Chestnut S3');
    // The exact id D-2 names does not exist; the search resolves to this one.
    expect(grinder?.id).toBe('timemore-s3');
  });

  it('refuses to flatten an anchors calibration rather than invent a step', () => {
    expect(
      toOwnGrinder({
        id: 'x',
        brand: 'X',
        model: 'Y',
        type: 'electric',
        burr: 'flat',
        scale: { min: 1, max: 40, step: 1, unit: 'click' },
        calibration: { kind: 'anchors', points: [{ setting: 1, microns: 300 }] },
        confidence: 'community',
        sources: [],
      }),
    ).toBeUndefined();
  });

  it('writes lang ru and exactly one own grinder on first run', async () => {
    const db = freshDb();
    expect(await seed(db)).toBe(true);

    expect(await getSetting('lang', db)).toBe('ru');
    expect(await getSetting('seeded', db)).toBe(true);
    expect(await getSetting('calib', db)).toEqual({ offset: 0, src: null });

    const grinders = await db.grinders.toArray();
    expect(grinders).toHaveLength(1);
    expect(grinders[0]).toMatchObject({
      id: 'timemore-s3',
      datasetId: 'timemore-s3',
      name: 'Timemore Chestnut S3',
      micronsPerStep: 86.7,
      zeroOffsetMicrons: 330,
      scale: { min: 0, max: 9, step: 0.1, unit: 'mark' },
    });
  });

  it('seeds nothing into the shelf or the log', async () => {
    const db = freshDb();
    await seed(db);

    expect(await db.beans.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
    expect(await db.devices.count()).toBe(0);
  });

  it('is idempotent and never clobbers what the user changed', async () => {
    const db = freshDb();
    await seed(db);

    await putSetting('lang', 'en', db);
    await db.grinders.put({
      id: 'own-1',
      name: 'Comandante C40',
      micronsPerStep: 30,
      zeroOffsetMicrons: 0,
      scale: { min: 0, max: 50, step: 1, unit: 'click' },
    });

    expect(await seed(db)).toBe(false);

    expect(await getSetting('lang', db)).toBe('en');
    expect(await db.grinders.count()).toBe(2);
  });

  it('survives a reopen: a second launch adds nothing', async () => {
    const name = `brew-journal-test-${crypto.randomUUID()}`;

    const first = new BrewJournalDB(name);
    open.push(first);
    await seed(first);
    first.close();

    const second = new BrewJournalDB(name);
    open.push(second);
    expect(await seed(second)).toBe(false);
    expect(await second.grinders.count()).toBe(1);
    expect(await second.settings.count()).toBe(4);
  });
});
