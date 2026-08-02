/**
 * Фото пачки на телефоне: камера Capacitor плюс файлы в `Directory.Data`.
 *
 * Числа взяты из «Хранение и бюджет» (CLAUDE_CODE_TASK): `quality 80` и
 * `width 2048` — даунскейл делает нативный слой, поэтому сырой снимок на 3–5 МБ
 * до JavaScript просто не доезжает, а итоговый файл весит 200–400 КБ. Мелкий
 * шрифт этикетки на 2048 px ещё читается — это и есть граница.
 *
 * В базе лежит только путь и миниатюра 256 px; сам файл — в `Directory.Data`,
 * то есть в приватном хранилище приложения, которое не индексируется галереей и
 * уезжает вместе с удалением приложения. Никакого base64 в IndexedDB: он на
 * треть толще и раздувает базу, которую мы обещали держать маленькой.
 *
 * `resultType: Uri` вместо `Base64` — по той же причине: мост Capacitor
 * передаёт строку, и гнать через него мегабайты снимка, чтобы тут же положить
 * их обратно в файл, бессмысленно. `Filesystem.copy` делает это нативно.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';

import { fromBase64, mimeOf, toBase64 } from './bytes.js';
import {
  type CapturedPhoto,
  FULL_SIDE,
  type PhotoStore,
  QUALITY,
  THUMB_SIDE,
  fitTo,
} from './photos.js';

/** Качество нативного пережатия, 0..100. Веб-слой держит ту же долю дробью. */
const NATIVE_QUALITY = 80;

/** Каталог снимков внутри `Directory.Data`. */
const DIR = 'photos';

/** Префикс путей, которые ведут в файловую систему приложения. */
const PREFIX = 'cap:';

const THUMB_MIME = 'image/webp';

function newName(ext: string): string {
  return `${DIR}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Относительный путь внутри `Directory.Data` из непрозрачного `path`. */
function inner(path: string): string | null {
  return path.startsWith(PREFIX) ? path.slice(PREFIX.length) : null;
}

/**
 * Миниатюра 256 px из полноразмерного снимка.
 *
 * Считается в WebView канвасом, а не нативно: второго вызова камеры ради
 * превью не существует, а нативного ресайза у Filesystem нет. 2048 px в
 * `createImageBitmap` — это десятки миллисекунд, и происходит это один раз на
 * снимок.
 */
async function makeThumb(full: Blob): Promise<string> {
  const bitmap = await createImageBitmap(full);
  const size = fitTo(bitmap.width, bitmap.height, THUMB_SIDE);

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Канвас недоступен');
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  return canvas.toDataURL(THUMB_MIME, QUALITY);
}

export function createCapacitorPhotos(): PhotoStore {
  const read = async (path: string): Promise<Blob> => {
    const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
    // На мобильных плагин отдаёт строку; `Blob` приходит только в вебе, куда
    // эта реализация не попадает.
    return typeof data === 'string' ? fromBase64(data, mimeOf(path)) : data;
  };

  return {
    async capture(): Promise<CapturedPhoto | null> {
      let photo;
      try {
        photo = await Camera.getPhoto({
          quality: NATIVE_QUALITY,
          width: FULL_SIDE,
          resultType: CameraResultType.Uri,
          // Выбор «камера или галерея» показывает системный лист — своего
          // экрана выбора у приложения нет и не нужно.
          source: CameraSource.Prompt,
          correctOrientation: true,
          saveToGallery: false,
        });
      } catch {
        // Отказ от съёмки и отказ в разрешении выглядят одинаково — оба
        // означают «снимка не будет».
        return null;
      }

      const from = photo.path ?? photo.webPath;
      if (!from) return null;

      const to = newName(photo.format || 'jpeg');
      await Filesystem.mkdir({ path: DIR, directory: Directory.Data, recursive: true }).catch(
        () => undefined,
      );
      await Filesystem.copy({ from, to, toDirectory: Directory.Data });

      const thumb = await makeThumb(await read(to));
      return { path: `${PREFIX}${to}`, thumb };
    },

    async load(path: string): Promise<Blob | string | null> {
      const rel = inner(path);
      // Не наш путь — это data-URL из деградировавшего веб-режима: он и есть
      // содержимое. Так импорт чужого экспорта не разваливается.
      if (rel === null) return path || null;

      try {
        return await read(rel);
      } catch {
        // Файл стёрли вместе с данными приложения — пустое место, не поломка.
        return null;
      }
    },

    async remove(path: string): Promise<void> {
      const rel = inner(path);
      if (rel === null) return;
      try {
        await Filesystem.deleteFile({ path: rel, directory: Directory.Data });
      } catch {
        /* уже нет — и хорошо */
      }
    },

    async save(data: Blob, ext: string): Promise<string> {
      const to = newName(ext);
      await Filesystem.mkdir({ path: DIR, directory: Directory.Data, recursive: true }).catch(
        () => undefined,
      );
      await Filesystem.writeFile({
        path: to,
        data: await toBase64(data),
        directory: Directory.Data,
      });
      return `${PREFIX}${to}`;
    },
  };
}
