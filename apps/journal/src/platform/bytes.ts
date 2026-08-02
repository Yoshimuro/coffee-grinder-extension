/**
 * Блоб ↔ base64 — то, чем разговаривает `@capacitor/filesystem`.
 *
 * Мост Capacitor ходит через JSON, поэтому байтов в нём нет: файл уезжает и
 * приезжает строкой base64. Всё преобразование собрано здесь, чтобы ни камера,
 * ни экспорт не переписывали его каждый по-своему.
 *
 * Модуль импортируется только из `*.capacitor.ts`, то есть в браузерный бандл
 * не попадает.
 */

/**
 * Base64 без префикса `data:`.
 *
 * `FileReader`, а не `btoa` по массиву: у большого снимка ручная сборка строки
 * из байтов упирается в лимит аргументов `String.fromCharCode` и в паузу на
 * главном потоке, а `readAsDataURL` делает то же самое нативно.
 */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Файл не читается'));
    };
    reader.onload = () => {
      const url = String(reader.result);
      const comma = url.indexOf(',');
      resolve(comma === -1 ? url : url.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Обратно: строка из `Filesystem.readFile` — в блоб нужного типа. */
export function fromBase64(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Тип по расширению файла — `Filesystem` его не хранит и не возвращает. */
export function mimeOf(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'zip') return 'application/zip';
  return 'image/jpeg';
}
