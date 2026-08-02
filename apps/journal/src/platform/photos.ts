/**
 * Фото пачки — платформенный интерфейс и веб-реализация.
 *
 * Интерфейс нарочно узкий и ничего не знает ни про камеру, ни про файловую
 * систему: на телефоне за ним стоит Capacitor (`photos.capacitor.ts` —
 * `Camera.getPhoto` плюс `Filesystem` в `Directory.Data`), в браузере — то, что
 * описано ниже, и ни один экран об этом не знает. `path` — непрозрачная
 * строка, её отдаёт реализация и она же читает.
 *
 * Веб-путь (prototype-shell-report §4): скрытый `<input type="file">`, канвас
 * ужимает длинную сторону до 2048 и кодирует в WebP q0.85, миниатюра — 256 px
 * data-URL.
 *
 * Где лежит полный снимок. Класть его в Dexie нельзя — схема v1 заморожена и
 * таблицы под блобы в ней нет. Поэтому полноразмерный WebP пишется в OPFS
 * (`navigator.storage.getDirectory()`), а в `path` уходит ссылка `opfs:…`.
 * Если OPFS в браузере нет, реализация честно деградирует до одной миниатюры:
 * `path === thumb`, полного снимка просто не существует. Ни то, ни другое не
 * увидит экран — он работает через `load()`.
 */

import { pickFile } from './files.js';
import { bind } from './native.js';

/** Ссылка на снимок ровно в том виде, в каком её хранит `PhotoRef` схемы. */
export interface CapturedPhoto {
  /** Непрозрачный путь для `load`/`remove`. */
  path: string;
  /** Миниатюра 256 px как data-URL — её можно вставить в `src` без загрузки. */
  thumb: string;
}

export interface PhotoStore {
  /** Снимок или выбор файла. `null` — пользователь отказался. */
  capture(): Promise<CapturedPhoto | null>;
  /** Содержимое по пути: блоб из хранилища или готовый data-URL. */
  load(path: string): Promise<Blob | string | null>;
  /** Удаляет снимок. Несуществующий путь — не ошибка. */
  remove(path: string): Promise<void>;
  /**
   * Кладёт готовые байты в хранилище и отдаёт путь к ним (BJ-6).
   *
   * Нужен импорту базы: снимки приезжают из zip уже сжатыми, второй раз их
   * ужимать нечем и незачем. Съёмка этим путём не пользуется — у неё свой,
   * с даунскейлом и миниатюрой.
   */
  save(data: Blob, ext: string): Promise<string>;
}

/** Длинная сторона полноразмерного снимка. */
export const FULL_SIDE = 2048;
/** Длинная сторона миниатюры. */
export const THUMB_SIDE = 256;
export const QUALITY = 0.85;
const MIME = 'image/webp';

/** Префикс путей, которые ведут в OPFS. */
const OPFS_PREFIX = 'opfs:';
const OPFS_DIR = 'photos';

/* ── Общие вычисления ────────────────────────────────────────────────────── */

/** Размер после вписывания в квадрат `side`. Меньшее не растягивается. */
export function fitTo(
  width: number,
  height: number,
  side: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= side || longest === 0) return { width, height };
  const k = side / longest;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/* ── Веб-реализация ──────────────────────────────────────────────────────── */

function hasOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function' &&
    typeof FileSystemFileHandle !== 'undefined' &&
    // Safari 15 отдаёт хендл без `createWritable` — писать в него нечем.
    'createWritable' in FileSystemFileHandle.prototype
  );
}

async function opfsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_DIR, { create: true });
}

/** Имя файла в OPFS: время плюс случайный хвост — столкнуться нечем. */
function newName(ext: string): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

async function decode(file: Blob): Promise<{ width: number; height: number; source: CanvasImageSource }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, source: bitmap };
  }

  // Фолбэк для WebView без `createImageBitmap`.
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Снимок не читается'));
      el.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight, source: image };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(
  source: CanvasImageSource,
  width: number,
  height: number,
  side: number,
): HTMLCanvasElement {
  const size = fitTo(width, height, side);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Канвас недоступен');
  ctx.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

/** Блоб как data-URL — единственная форма, которую можно положить в `path`. */
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Снимок не читается'));
    };
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.readAsDataURL(blob);
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Кодирование не удалось'))),
      MIME,
      QUALITY,
    );
  });
}

/**
 * Веб-хранилище снимков. Отдельная фабрика, а не синглтон, — чтобы будущая
 * Capacitor-реализация подставлялась той же формы объектом.
 */
export function createWebPhotos(): PhotoStore {
  /** Пишет блоб в OPFS и отдаёт путь с префиксом. */
  const write = async (blob: Blob, ext: string): Promise<string> => {
    const name = newName(ext);
    const dir = await opfsDir();
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return `${OPFS_PREFIX}${name}`;
  };

  return {
    async capture(): Promise<CapturedPhoto | null> {
      const file = await pickFile({ accept: 'image/*', camera: true });
      if (!file) return null;

      const { width, height, source } = await decode(file);
      const thumb = draw(source, width, height, THUMB_SIDE).toDataURL(MIME, QUALITY);

      if (!hasOpfs()) {
        // Деградация: полного снимка нет, оба поля показывают миниатюру.
        return { path: thumb, thumb };
      }

      const blob = await toBlob(draw(source, width, height, FULL_SIDE));
      return { path: await write(blob, 'webp'), thumb };
    },

    async save(data: Blob, ext: string): Promise<string> {
      // Без OPFS положить снимок некуда: возвращаем его data-URL'ом, и он же
      // становится «путём» — ровно та деградация, что и у `capture`.
      if (!hasOpfs()) return dataUrl(data);
      return write(data, ext);
    },

    async load(path: string): Promise<Blob | string | null> {
      if (!path) return null;
      if (!path.startsWith(OPFS_PREFIX)) return path;

      try {
        const dir = await opfsDir();
        const handle = await dir.getFileHandle(path.slice(OPFS_PREFIX.length));
        return await handle.getFile();
      } catch {
        // Снимок стёрли вместе с хранилищем сайта — пустое место, не поломка.
        return null;
      }
    },

    async remove(path: string): Promise<void> {
      if (!path.startsWith(OPFS_PREFIX)) return;
      try {
        const dir = await opfsDir();
        await dir.removeEntry(path.slice(OPFS_PREFIX.length));
      } catch {
        /* уже нет — и хорошо */
      }
    },
  };
}

/* ── Реализация, которую видят экраны ────────────────────────────────────── */

const store = bind<PhotoStore>(createWebPhotos, async () =>
  (await import('./photos.capacitor.js')).createCapacitorPhotos(),
);

/**
 * Фасад: тот же интерфейс, но реализация выбирается при первом обращении.
 *
 * Из-за `import()` нативная реализация не может приехать синхронно, поэтому
 * объект-синглтон здесь — не она сама, а тонкая переадресация. Экраны разницы
 * не видят: все методы интерфейса и так возвращают промисы.
 */
export const photos: PhotoStore = {
  capture: async () => (await store()).capture(),
  load: async (path) => (await store()).load(path),
  remove: async (path) => {
    await (await store()).remove(path);
  },
  save: async (data, ext) => (await store()).save(data, ext),
};

/**
 * Готовый `src` для `<img>` плюс способ его отпустить.
 *
 * Object-URL живёт до `revoke()`, поэтому вызывающий обязан позвать его в
 * уборке эффекта — иначе снимки будут копиться в памяти WebView.
 */
export async function photoSrc(
  path: string,
  store: PhotoStore = photos,
): Promise<{ url: string; revoke: () => void } | null> {
  const data = await store.load(path);
  if (data === null) return null;
  if (typeof data === 'string') return { url: data, revoke: () => undefined };

  const url = URL.createObjectURL(data);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}
