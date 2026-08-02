/**
 * Обмен базой — контракт №2 (BJ-6).
 *
 * Проверяется не «функция вернула объект», а обещание контракта: выгрузка
 * содержит всё, включая файлы снимков; загрузка восстанавливает базу целиком;
 * чужая версия отвергается ДО единой записи, то есть база остаётся прежней.
 *
 * Хранилище снимков — поддельное, на карте в памяти: настоящее в Node
 * недоступно (нет ни OPFS, ни Filesystem Capacitor), а интерфейс `PhotoStore`
 * ровно для этого и узкий.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  DATA_ENTRY,
  EXPORT_VERSION,
  type ExportFile,
  ImportError,
  PHOTO_DIR,
  collectExport,
  extOf,
  importExport,
  packExport,
  photoPath,
  readExport,
} from '../../src/db/transfer.js';
import { BrewJournalDB, putSetting } from '../../src/db/schema.js';
import type { BeanRecord, DeviceRecord, EntryRecord, GrinderRecord } from '../../src/db/schema.js';
import type { CapturedPhoto, PhotoStore } from '../../src/platform/photos.js';

/* ── Оснастка ────────────────────────────────────────────────────────────── */

/** Единственный элемент списка. Пустой список — это провал теста, а не `undefined`. */
function only<T>(list: readonly T[]): T {
  expect(list).toHaveLength(1);
  const [first] = list;
  if (first === undefined) throw new Error('список пуст');
  return first;
}

let open: BrewJournalDB[] = [];

function freshDb(): BrewJournalDB {
  const database = new BrewJournalDB(`brew-journal-transfer-${crypto.randomUUID()}`);
  open.push(database);
  return database;
}

afterEach(async () => {
  for (const database of open) database.close();
  for (const database of open) await database.delete();
  open = [];
});

/** Хранилище снимков в памяти. `capture` не нужен — снимает интерфейс, не тест. */
function fakeStore(): PhotoStore & { files: Map<string, Blob> } {
  const files = new Map<string, Blob>();
  let n = 0;

  return {
    files,
    capture: (): Promise<CapturedPhoto | null> => Promise.resolve(null),
    // Свой путь — файл; чужой — деградация без OPFS, где путь и есть data-URL.
    load: (path: string) =>
      Promise.resolve(files.get(path) ?? (path.startsWith('mem:') ? null : path)),
    remove: (path: string) => {
      files.delete(path);
      return Promise.resolve();
    },
    save: (data: Blob, ext: string) => {
      const path = `mem:${String(n++)}.${ext}`;
      files.set(path, data);
      return Promise.resolve(path);
    },
  };
}

const GRINDER: GrinderRecord = {
  id: 'c40',
  name: 'Comandante C40',
  micronsPerStep: 8.7,
  zeroOffsetMicrons: 300,
  scale: { min: 0, max: 60, step: 1, unit: 'click' },
};

const DEVICE: DeviceRecord = {
  id: 'v60',
  name: 'V60',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'ceramic',
  vol: 'm',
};

const ENTRY: EntryRecord = {
  id: 'j1',
  date: '2026-07-30',
  time: '09:12',
  bean: 'java',
  device: 'v60',
  devName: 'V60',
  mode: 'perc',
  grind: 4.6,
  dose: 15,
  water: 250,
  temp: 94,
  total: 195,
  stages: [
    ['bloom', 45, 45],
    ['pour', 40, 205],
    ['drain', 50, 0],
  ],
  pours: 1,
  status: 'done',
  diag: { acid: 7, bitter: 3, body: 5, balance: 8 },
  desc: [['berry', 2]],
  note: 'сладко',
};

/** Кладёт базу с одной пачкой, у которой есть настоящий файл снимка. */
async function seedBase(database: BrewJournalDB, store: PhotoStore): Promise<BeanRecord> {
  const path = await store.save(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/webp' }), 'webp');
  const bean: BeanRecord = {
    id: 'java',
    form: 'beans',
    name: 'Ява Золотая',
    roast: '2026-07-20',
    photos: [{ path, thumb: 'data:image/webp;base64,AAA' }],
    weight: 250,
    left: 235,
  };

  await database.grinders.put(GRINDER);
  await database.devices.put(DEVICE);
  await database.beans.put(bean);
  await database.entries.put(ENTRY);
  await putSetting('lang', 'en', database);
  await putSetting('seeded', true, database);

  return bean;
}

/* ── Тесты ───────────────────────────────────────────────────────────────── */

describe('пути и расширения внутри архива', () => {
  it('имя снимка собирается из id пачки и порядкового номера', () => {
    expect(photoPath('java', 0, 'webp')).toBe(`${PHOTO_DIR}/java/0.webp`);
    expect(photoPath('java', 2, 'jpg')).toBe(`${PHOTO_DIR}/java/2.jpg`);
  });

  it('расширение — по типу блоба, неизвестное падает в bin', () => {
    expect(extOf('image/webp')).toBe('webp');
    expect(extOf('image/jpeg')).toBe('jpg');
    expect(extOf('image/png')).toBe('png');
    expect(extOf('application/x-unknown')).toBe('bin');
  });
});

describe('сборка выгрузки', () => {
  it('складывает все пять коллекций и разворачивает снимки в файлы', async () => {
    const database = freshDb();
    const store = fakeStore();
    await seedBase(database, store);

    const { file, blobs } = await collectExport({ database, store });

    expect(file.version).toBe(EXPORT_VERSION);
    expect(Date.parse(file.exportedAt)).not.toBeNaN();
    expect(file.grinders).toHaveLength(1);
    expect(file.devices).toHaveLength(1);
    expect(file.beans).toHaveLength(1);
    expect(file.entries).toHaveLength(1);
    // Настройки уезжают собранным объектом, а не строками таблицы.
    expect(file.settings.lang).toBe('en');

    // Путь в JSON — относительный внутри архива, а не адрес этой установки.
    const photo = only(only(file.beans).photos);
    expect(photo.path).toBe(`${PHOTO_DIR}/java/0.webp`);
    expect(photo.thumb).toBe('data:image/webp;base64,AAA');
    expect(blobs.has(photo.path)).toBe(true);
  });

  it('архив содержит data.json и файл снимка', async () => {
    const database = freshDb();
    const store = fakeStore();
    await seedBase(database, store);

    const zip = await packExport({ database, store });
    expect(zip.type).toBe('application/zip');

    const { file } = await readExport(zip);
    expect(only(file.beans).name).toBe('Ява Золотая');

    const { zip: raw } = await readExport(zip);
    expect(raw.file(DATA_ENTRY)).not.toBeNull();
    expect(raw.file(`${PHOTO_DIR}/java/0.webp`)).not.toBeNull();
  });
});

describe('импорт', () => {
  it('восстанавливает базу и файлы снимков в чистом профиле', async () => {
    const source = freshDb();
    const sourceStore = fakeStore();
    await seedBase(source, sourceStore);
    const zip = await packExport({ database: source, store: sourceStore });

    // «Чистый профиль»: другая база и другое хранилище снимков.
    const target = freshDb();
    const targetStore = fakeStore();
    await importExport(zip, { database: target, store: targetStore });

    expect(await target.grinders.toArray()).toEqual([GRINDER]);
    expect(await target.devices.toArray()).toEqual([DEVICE]);
    expect(await target.entries.toArray()).toEqual([ENTRY]);

    const bean = only(await target.beans.toArray());
    expect(bean.name).toBe('Ява Золотая');

    // Снимок стал файлом нового хранилища, а не путём внутри архива.
    const photo = only(bean.photos);
    expect(photo.path).not.toContain(PHOTO_DIR);
    const restored = targetStore.files.get(photo.path);
    expect(restored).toBeInstanceOf(Blob);
    expect(await restored?.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3, 4]).buffer);

    const settings = await target.settings.toArray();
    expect(settings.find((row) => row.key === 'lang')?.value).toBe('en');
  });

  it('заменяет базу целиком, не смешивая со старой', async () => {
    const source = freshDb();
    const sourceStore = fakeStore();
    await seedBase(source, sourceStore);
    const zip = await packExport({ database: source, store: sourceStore });

    const target = freshDb();
    const targetStore = fakeStore();
    await target.grinders.put({ ...GRINDER, id: 'other', name: 'Чужая молка' });
    await target.entries.put({ ...ENTRY, id: 'jOld' });

    await importExport(zip, { database: target, store: targetStore });

    expect((await target.grinders.toArray()).map((g) => g.id)).toEqual(['c40']);
    expect((await target.entries.toArray()).map((e) => e.id)).toEqual(['j1']);
  });

  it('чужую версию отвергает и базу не трогает', async () => {
    const source = freshDb();
    const sourceStore = fakeStore();
    await seedBase(source, sourceStore);

    const { file, blobs } = await collectExport({ database: source, store: sourceStore });
    const future: ExportFile = { ...file, version: 2 };

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file(DATA_ENTRY, JSON.stringify(future));
    for (const [path, blob] of blobs) zip.file(path, await blob.arrayBuffer());
    const bytes = await zip.generateAsync({ type: 'uint8array' });

    const target = freshDb();
    const targetStore = fakeStore();
    await target.grinders.put({ ...GRINDER, id: 'mine', name: 'Своя молка' });

    await expect(importExport(bytes, { database: target, store: targetStore })).rejects.toThrow(
      ImportError,
    );

    // Ни частичного импорта, ни записанных файлов.
    expect((await target.grinders.toArray()).map((g) => g.id)).toEqual(['mine']);
    expect(await target.beans.count()).toBe(0);
    expect(targetStore.files.size).toBe(0);
  });

  it('различает битый архив и чужую версию кодом ошибки', async () => {
    const notAZip = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/zip' });
    await expect(readExport(notAZip)).rejects.toMatchObject({ code: 'zip' });

    const JSZip = (await import('jszip')).default;
    const empty = new JSZip();
    empty.file('readme.txt', 'ничего интересного');
    await expect(readExport(await empty.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject(
      { code: 'shape' },
    );

    const wrong = new JSZip();
    wrong.file(DATA_ENTRY, JSON.stringify({ version: 99 }));
    await expect(readExport(await wrong.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject(
      { code: 'version' },
    );
  });
});
