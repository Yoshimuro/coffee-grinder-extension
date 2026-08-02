/**
 * Файл наружу на телефоне: временный файл плюс системный «поделиться».
 *
 * Прямой записи «в Загрузки» у Capacitor нет и быть не может — на Android это
 * либо SAF-диалог, либо разрешение на внешнюю память. Поэтому zip пишется в
 * `Directory.Cache` (систему можно чистить в любой момент, и это правильно: файл
 * нужен ровно на время передачи), а дальше его судьбу решает человек в
 * системном листе: облако, мессенджер, «Сохранить в файлы».
 *
 * `Share.share({ files: [uri] })` требует `file://`-адреса, а не пути внутри
 * песочницы, поэтому после записи спрашиваем `getUri`. Отмену листа плагин
 * отдаёт исключением — она не ошибка, а обычный ответ «передумал».
 */

import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { toBase64 } from './bytes.js';
import type { FileSink } from './files.js';

export function createCapacitorFiles(): FileSink {
  return {
    async save(name: string, blob: Blob): Promise<boolean> {
      const data = await toBase64(blob);
      await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });

      try {
        await Share.share({ title: name, files: [uri] });
        return true;
      } catch {
        // Лист закрыли, ничего не выбрав. Файл остаётся в кеше — система
        // приберёт его сама.
        return false;
      }
    },
  };
}
