/**
 * Файл наружу и файл внутрь — платформенный интерфейс и веб-реализация.
 *
 * Наружу (экспорт базы) платформы расходятся: браузер умеет только скачать, а
 * телефон обязан отдать файл в системный «поделиться» — иначе zip осядет в
 * песочнице приложения, откуда его никто не достанет.
 *
 * Внутрь (импорт базы) платформы совпадают: `<input type="file">` работает и во
 * вкладке, и в WebView Capacitor — мост перехватывает `onShowFileChooser` и
 * открывает системный выбор документов. Поэтому выбор файла здесь один на всех
 * и нативной реализации у него нет.
 */

import { bind } from './native.js';

/** Куда уходит собранный файл. */
export interface FileSink {
  /**
   * Отдаёт файл человеку. `false` — не получилось или отказались; вызывающий
   * решает, показывать ли это на экране.
   */
  save(name: string, blob: Blob): Promise<boolean>;
}

/* ── Выбор файла (общий) ─────────────────────────────────────────────────── */

export interface PickOptions {
  /** Значение атрибута `accept`: `image/*`, `.zip,application/zip`. */
  accept: string;
  /** `capture="environment"` — на мобильном открывает камеру сразу. */
  camera?: boolean;
}

/**
 * Открывает системный выбор файла и ждёт ответа.
 *
 * Отмена ловится событием `cancel` (Chrome 113+, Safari 16.4+); в браузере
 * постарше промис останется висеть до следующего выбора — это не течёт, но и не
 * разрешается, поэтому вызывающему нельзя блокировать интерфейс на этом
 * ожидании.
 */
export function pickFile(options: PickOptions): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    if (options.camera) input.setAttribute('capture', 'environment');
    input.style.display = 'none';

    const done = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => done(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => done(null), { once: true });

    document.body.append(input);
    input.click();
  });
}

/* ── Веб-реализация ──────────────────────────────────────────────────────── */

/**
 * Скачивание браузером: object-URL и синтетический клик по `<a download>`.
 *
 * URL освобождается не сразу, а следующим тиком: Firefox и WebKit начинают
 * читать блоб уже после возврата из обработчика клика, и мгновенный `revoke`
 * оставлял бы пустой файл.
 */
export function createWebFiles(): FileSink {
  return {
    save(name: string, blob: Blob): Promise<boolean> {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.style.display = 'none';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
      return Promise.resolve(true);
    },
  };
}

/* ── Реализация, которую видят экраны ────────────────────────────────────── */

const sink = bind<FileSink>(createWebFiles, async () =>
  (await import('./files.capacitor.js')).createCapacitorFiles(),
);

export const files: FileSink = {
  save: async (name, blob) => (await sink()).save(name, blob),
};
