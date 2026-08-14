import { afterEach, describe, expect, it } from 'vitest';

import { nameOf } from '../../src/data/wheel.js';
import { effectiveWheelSet } from '../../src/data/wheel-edits.js';
import {
  addWheelNode,
  hideWheelNode,
  newCustomId,
  renameWheelNode,
  resetWheelEdits,
  slugify,
  undoWheelEdit,
} from '../../src/db/repo/wheel.js';
import { BrewJournalDB, type EntryRecord, getSetting } from '../../src/db/schema.js';

/* Одноразовая база на тест — по образцу `db.test.ts`. */
let open: BrewJournalDB[] = [];

function freshDb(): BrewJournalDB {
  const database = new BrewJournalDB(`brew-journal-test-${crypto.randomUUID()}`);
  open.push(database);
  return database;
}

afterEach(async () => {
  for (const database of open) database.close();
  for (const database of open) await database.delete();
  open = [];
});

async function edits(database: BrewJournalDB) {
  return (await getSetting('wheelEdits', database)) ?? [];
}

/** Запись с одним дескриптором — чтобы пометить пользовательский id занятым. */
function entryWith(id: string, desc: string): EntryRecord {
  return {
    id,
    date: '2026-08-14',
    time: '10:00',
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
    status: 'done',
    diag: { acid: 5, bitter: 5, body: 5, balance: 5 },
    desc: [[desc, 2]],
    note: '',
  };
}

describe('slugify и чеканка id', () => {
  it('транслитерирует русский ввод', () => {
    expect(slugify('Амаретто')).toBe('amaretto');
    expect(slugify('Крем-брюле')).toBe('krem-bryule');
    expect(slugify('  Ежевичный джем!  ')).toBe('ezhevichnyi-dzhem');
  });

  it('латиницу и цифры пропускает как есть, мусор станет дефисом', () => {
    expect(slugify('Cascara 2.0')).toBe('cascara-2-0');
  });

  it('пустое имя не даёт пустой слаг', () => {
    expect(slugify('—')).toBe('node');
  });

  it('занятый id добивается суффиксом', () => {
    const taken = new Set(['u-sliva', 'u-sliva-2']);
    expect(newCustomId('Слива', (x) => taken.has(x))).toBe('u-sliva-3');
    expect(newCustomId('Слива', () => false)).toBe('u-sliva');
  });
});

describe('addWheelNode', () => {
  it('добавляет дескриптор с u--id, имя ложится в оба языка', async () => {
    const db = freshDb();
    const id = await addWheelNode('desc', 'spirits', 'Амаретто', db);
    expect(id).toBe('u-amaretto');
    expect(await edits(db)).toEqual([
      { op: 'add-desc', id: 'u-amaretto', sub: 'spirits', ru: 'Амаретто', en: 'Амаретто' },
    ]);
  });

  it('вторая «слива» получает суффикс: встроенный plum занят', async () => {
    const db = freshDb();
    // slugify('Слива') = 'sliva', не конфликт; проверяем конфликт с самим собой
    await addWheelNode('desc', 'spirits', 'Слива', db);
    const second = await addWheelNode('desc', 'ferm', 'Слива', db);
    expect(second).toBe('u-sliva-2');
  });

  it('пустое имя и неизвестный родитель отклоняются без записи', async () => {
    const db = freshDb();
    expect(await addWheelNode('desc', 'spirits', '   ', db)).toBeNull();
    expect(await addWheelNode('desc', 'нет-такого', 'Имя', db)).toBeNull();
    expect(await edits(db)).toEqual([]);
  });

  it('подкатегория добавляется в категорию', async () => {
    const db = freshDb();
    const id = await addWheelNode('sub', 'ferment', 'Пиво', db);
    expect(id).toBe('u-pivo');
    const ws = effectiveWheelSet(await edits(db));
    expect(ws.cats.find((c) => c.id === 'ferment')?.sub.map((s) => s.id)).toContain('u-pivo');
  });
});

describe('renameWheelNode', () => {
  it('встроенный узел получает rename-правку, повторная заменяет прежнюю', async () => {
    const db = freshDb();
    await renameWheelNode('whisky', 'Скотч', 'Scotch', db);
    await renameWheelNode('whisky', 'Бурбон', 'Bourbon', db);
    expect(await edits(db)).toEqual([
      { op: 'rename', target: 'whisky', ru: 'Бурбон', en: 'Bourbon' },
    ]);
  });

  it('пользовательский узел правится в своей add-правке, без второй записи', async () => {
    const db = freshDb();
    await addWheelNode('desc', 'spirits', 'Амаретто', db);
    await renameWheelNode('u-amaretto', 'Амаретто DiSaronno', 'Amaretto', db);
    expect(await edits(db)).toEqual([
      {
        op: 'add-desc',
        id: 'u-amaretto',
        sub: 'spirits',
        ru: 'Амаретто DiSaronno',
        en: 'Amaretto',
      },
    ]);
  });
});

describe('hideWheelNode', () => {
  it('встроенный узел скрывается правкой, повторное скрытие не дублируется', async () => {
    const db = freshDb();
    await hideWheelNode('whisky', db);
    await hideWheelNode('whisky', db);
    expect(await edits(db)).toEqual([{ op: 'hide', target: 'whisky' }]);
  });

  it('неиспользованный пользовательский дескриптор удаляется вместе с переименованиями', async () => {
    const db = freshDb();
    await addWheelNode('desc', 'spirits', 'Амаретто', db);
    await renameWheelNode('u-amaretto', 'Скотч', 'Scotch', db);
    await hideWheelNode('u-amaretto', db);
    expect(await edits(db)).toEqual([]);
  });

  it('использованный в записи пользовательский дескриптор только скрывается — имя живёт', async () => {
    const db = freshDb();
    await addWheelNode('desc', 'spirits', 'Амаретто', db);
    await db.entries.put(entryWith('e1', 'u-amaretto'));
    await hideWheelNode('u-amaretto', db);

    const list = await edits(db);
    expect(list).toHaveLength(2);
    expect(list[1]).toEqual({ op: 'hide', target: 'u-amaretto' });

    // Могильник работает: скрытый пользовательский узел по-прежнему называется.
    const ws = effectiveWheelSet(list);
    expect(nameOf('u-amaretto', 'ru', ws)).toBe('Амаретто');
  });
});

describe('undo и сброс', () => {
  it('отмена убирает ровно одну правку, сброс — все', async () => {
    const db = freshDb();
    await addWheelNode('desc', 'spirits', 'Амаретто', db);
    await hideWheelNode('whisky', db);

    await undoWheelEdit({ op: 'hide', target: 'whisky' }, db);
    expect(await edits(db)).toEqual([
      { op: 'add-desc', id: 'u-amaretto', sub: 'spirits', ru: 'Амаретто', en: 'Амаретто' },
    ]);

    // Отмена несуществующей правки молчит.
    await undoWheelEdit({ op: 'hide', target: 'нет-такой' }, db);
    expect(await edits(db)).toHaveLength(1);

    await resetWheelEdits(db);
    expect(await edits(db)).toEqual([]);
  });
});
