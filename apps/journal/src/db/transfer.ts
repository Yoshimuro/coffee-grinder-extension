/**
 * Экспорт и импорт базы — контракт №2 задачи BJ-6.
 *
 * Формат: zip с `data.json` и каталогом `photos/**`. Один файл, потому что
 * снимки пачек — это файлы, а не строки: держать их в JSON base64-ом значило бы
 * раздуть выгрузку на треть и сделать её нечитаемой глазами.
 *
 * `version` в `data.json` — не украшение. Читатель, встретив незнакомую версию,
 * обязан отказаться целиком: половина импортированной базы хуже, чем ноль.
 * Поэтому проверка стоит до единой записи в Dexie, а не по ходу.
 *
 * Zip собирается JSZip'ом в веб-слое (D-2), а не нативным плагином: один и тот
 * же код работает и в APK, и в браузере, и в юнит-тесте под Node — а разных
 * реализаций у формата обмена быть не должно.
 *
 * Транзакционность. Файлы снимков живут вне Dexie, поэтому «одной транзакцией»
 * их не заменить. Порядок выбран так, чтобы провал на любом шаге не оставил
 * базу с битыми ссылками:
 *   1. распаковать и проверить версию — до этого момента ничего не изменилось;
 *   2. записать НОВЫЕ снимки (старые ещё на месте, ссылок на новые ещё нет);
 *   3. одной транзакцией Dexie заменить все пять таблиц;
 *   4. и только теперь удалить старые файлы.
 * Падение на шаге 2 или 3 откатывает шаг 2 — новые файлы удаляются, база
 * остаётся прежней и целой.
 */

import type JSZip from 'jszip';

import { type PhotoStore, photos } from '../platform/photos.js';
import { readSettings } from './repo/settings.js';
import {
  type BeanRecord,
  type BrewJournalDB,
  type DeviceRecord,
  type EntryRecord,
  type GrinderRecord,
  type PhotoRef,
  type SettingKey,
  type SettingsValues,
  db,
} from './schema.js';

/**
 * JSZip подгружается по требованию.
 *
 * Библиотека весит около сотни килобайт минифицированного кода, а нужна ровно
 * двум строкам в настройках. Держать её в стартовом бандле офлайн-приложения,
 * которое обязано открываться мгновенно, — плата не по товару.
 */
async function jszip(): Promise<typeof JSZip> {
  return (await import('jszip')).default;
}

/** Версия формата обмена. Любое изменение формы — `2` плюс читатель `1`. */
export const EXPORT_VERSION = 1;

/** Имя файла выгрузки. Фигурирует в контракте, поэтому живёт константой. */
export const EXPORT_FILE = 'brew-journal-export.zip';

export const EXPORT_MIME = 'application/zip';

/** Имя записи с базой внутри архива. */
export const DATA_ENTRY = 'data.json';

/** Каталог снимков внутри архива. */
export const PHOTO_DIR = 'photos';

/** Содержимое `data.json`. Порядок полей — как в контракте. */
export interface ExportFile {
  version: number;
  exportedAt: string;
  settings: SettingsValues;
  grinders: GrinderRecord[];
  devices: DeviceRecord[];
  beans: BeanRecord[];
  entries: EntryRecord[];
}

export interface TransferDeps {
  database?: BrewJournalDB;
  store?: PhotoStore;
}

/** Почему импорт не состоялся. Экран показывает по коду свою строку. */
export type ImportFailure = 'zip' | 'version' | 'shape';

export class ImportError extends Error {
  readonly code: ImportFailure;

  constructor(code: ImportFailure, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

/* ── Экспорт ─────────────────────────────────────────────────────────────── */

/** Расширение по типу блоба. Внутри архива снимки лежат под своими именами. */
export function extOf(mime: string): string {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return 'bin';
}

/** Путь снимка внутри архива: `photos/<beanId>/<n>.<ext>`. */
export function photoPath(beanId: string, index: number, ext: string): string {
  return `${PHOTO_DIR}/${beanId}/${String(index)}.${ext}`;
}

export interface ExportContent {
  file: ExportFile;
  /** Файлы снимков по путям внутри архива. */
  blobs: Map<string, Blob>;
}

/**
 * Читает базу и разворачивает снимки в файлы.
 *
 * Путь снимка в `data.json` подменяется на путь внутри архива: непрозрачные
 * `opfs:…`/`cap:…` — адреса конкретной установки, на другом устройстве они не
 * значат ничего. Миниатюра остаётся data-URL'ом в JSON: она весит килобайты и
 * нужна полке немедленно, без чтения файлов.
 *
 * Снимок, который хранилище отдало строкой (деградация без OPFS: `path` и есть
 * data-URL), в архив файлом не уезжает — переносить нечего, он уже в JSON.
 */
export async function collectExport(deps: TransferDeps = {}): Promise<ExportContent> {
  const database = deps.database ?? db;
  const store = deps.store ?? photos;

  const [settings, grinders, devices, beans, entries] = await Promise.all([
    readSettings(database),
    database.grinders.toArray(),
    database.devices.toArray(),
    database.beans.toArray(),
    database.entries.toArray(),
  ]);

  const blobs = new Map<string, Blob>();
  const packed: BeanRecord[] = [];

  for (const bean of beans) {
    const refs: PhotoRef[] = [];
    for (const [index, photo] of bean.photos.entries()) {
      const data = await store.load(photo.path);
      if (data instanceof Blob) {
        const path = photoPath(bean.id, index, extOf(data.type));
        blobs.set(path, data);
        refs.push({ path, thumb: photo.thumb });
      } else {
        // Файла нет (стёрли хранилище) или его роль играет сам data-URL —
        // ссылку оставляем как есть, она самодостаточна.
        refs.push({ ...photo });
      }
    }
    packed.push({ ...bean, photos: refs });
  }

  return {
    file: {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      grinders,
      devices,
      beans: packed,
      entries,
    },
    blobs,
  };
}

/**
 * Собирает архив.
 *
 * Снимки кладутся без сжатия: webp и jpeg уже сжаты, и deflate поверх них
 * тратит секунды, чтобы выиграть проценты. `data.json` — наоборот, текст, и
 * жмётся в разы.
 */
export async function packExport(deps: TransferDeps = {}): Promise<Blob> {
  const { file, blobs } = await collectExport(deps);

  const Zip = await jszip();
  const zip = new Zip();
  zip.file(DATA_ENTRY, JSON.stringify(file), { compression: 'DEFLATE' });
  for (const [path, blob] of blobs) {
    zip.file(path, await blob.arrayBuffer(), { compression: 'STORE' });
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([bytes], { type: EXPORT_MIME });
}

/* ── Импорт ──────────────────────────────────────────────────────────────── */

function isRecordArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((x) => typeof x === 'object' && x !== null);
}

/**
 * Разбирает архив и проверяет его до единой записи в базу.
 *
 * Проверяется ровно то, на что опирается запись: версия, наличие всех пяти
 * коллекций и то, что они — массивы объектов. Полной валидации схемы здесь нет
 * намеренно: файл писала эта же программа, и превращать импорт в парсер с
 * миллионом ветвлений значит городить второй источник правды о схеме.
 */
export async function readExport(source: Blob | ArrayBuffer | Uint8Array): Promise<{
  file: ExportFile;
  zip: JSZip;
}> {
  let zip: JSZip;
  try {
    const Zip = await jszip();
    const data = source instanceof Blob ? await source.arrayBuffer() : source;
    zip = await Zip.loadAsync(data);
  } catch {
    throw new ImportError('zip', 'Файл не читается как архив');
  }

  const entry = zip.file(DATA_ENTRY);
  if (!entry) throw new ImportError('shape', `В архиве нет ${DATA_ENTRY}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(await entry.async('string'));
  } catch {
    throw new ImportError('shape', `${DATA_ENTRY} не разбирается`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ImportError('shape', `${DATA_ENTRY} не объект`);
  }

  const file = parsed as Partial<ExportFile>;

  // Версия — первой: незнакомый формат мы читать не умеем и врать об этом не
  // будем, даже если остальные поля на месте.
  if (file.version !== EXPORT_VERSION) {
    throw new ImportError('version', `Версия формата ${String(file.version)} не поддерживается`);
  }

  if (
    !isRecordArray(file.grinders) ||
    !isRecordArray(file.devices) ||
    !isRecordArray(file.beans) ||
    !isRecordArray(file.entries) ||
    typeof file.settings !== 'object' ||
    file.settings === null
  ) {
    throw new ImportError('shape', 'В выгрузке не хватает коллекций');
  }

  return { file: file as ExportFile, zip };
}

/** Снимки, которые придётся восстановить файлами: их путь ведёт внутрь архива. */
function fromArchive(path: string): boolean {
  return path.startsWith(`${PHOTO_DIR}/`);
}

function extIn(path: string): string {
  return path.slice(path.lastIndexOf('.') + 1).toLowerCase();
}

function mimeOf(path: string): string {
  const ext = extIn(path);
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * Заменяет базу содержимым архива. Возвращает то, что было записано.
 *
 * Порядок шагов — в шапке файла. Здесь важно одно: `bulkPut` идёт после
 * `clear()` внутри одной транзакции, поэтому «половины импорта» в базе не
 * бывает — Dexie откатит всё.
 */
export async function applyExport(
  file: ExportFile,
  zip: JSZip,
  deps: TransferDeps = {},
): Promise<ExportFile> {
  const database = deps.database ?? db;
  const store = deps.store ?? photos;

  const oldPaths = (await database.beans.toArray()).flatMap((b) => b.photos.map((p) => p.path));
  const written: string[] = [];

  try {
    const beans: BeanRecord[] = [];
    for (const bean of file.beans) {
      const refs: PhotoRef[] = [];
      for (const photo of bean.photos) {
        const inZip = fromArchive(photo.path) ? zip.file(photo.path) : null;
        if (!inZip) {
          // Ссылка самодостаточна (data-URL) либо файла в архиве нет — в обоих
          // случаях переносим её как есть, миниатюра всё равно покажется.
          refs.push({ ...photo });
          continue;
        }
        const bytes = await inZip.async('uint8array');
        const path = await store.save(
          new Blob([bytes], { type: mimeOf(photo.path) }),
          extIn(photo.path),
        );
        written.push(path);
        refs.push({ path, thumb: photo.thumb });
      }
      beans.push({ ...bean, photos: refs });
    }

    await database.transaction(
      'rw',
      database.grinders,
      database.devices,
      database.beans,
      database.entries,
      database.settings,
      async () => {
        await Promise.all([
          database.grinders.clear(),
          database.devices.clear(),
          database.beans.clear(),
          database.entries.clear(),
          database.settings.clear(),
        ]);

        await database.grinders.bulkPut(file.grinders);
        await database.devices.bulkPut(file.devices);
        await database.beans.bulkPut(beans);
        await database.entries.bulkPut(file.entries);
        await database.settings.bulkPut(
          Object.entries(file.settings).map(([key, value]) => ({
            key: key as SettingKey,
            value: value as SettingsValues[SettingKey],
          })),
        );
      },
    );

    // База уже ссылается на новые файлы — старые можно отпускать. Неудача здесь
    // означает лишь занятое место, а не потерянные данные, поэтому глотается.
    await Promise.all(oldPaths.map((path) => store.remove(path).catch(() => undefined)));

    return { ...file, beans };
  } catch (error) {
    // Ни база, ни старые файлы не тронуты — убираем за собой то, что успели
    // записать, и отдаём ошибку наверх.
    await Promise.all(written.map((path) => store.remove(path).catch(() => undefined)));
    throw error;
  }
}

/** Полный импорт: разбор, проверка, замена. Бросает {@link ImportError}. */
export async function importExport(
  source: Blob | ArrayBuffer | Uint8Array,
  deps: TransferDeps = {},
): Promise<ExportFile> {
  const { file, zip } = await readExport(source);
  return applyExport(file, zip, deps);
}

