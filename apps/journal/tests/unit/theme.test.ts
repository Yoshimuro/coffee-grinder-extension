/**
 * Тема — то, что в ней есть проверяемого без экрана (BJ-9).
 *
 * Тесты идут в node-окружении, рендера нет (`vitest.config.ts`), поэтому сюда
 * попадают правила, а не картинка: как выбор превращается в применённую тему и
 * не разъехались ли три копии одних и тех же констант.
 *
 * Про копии стоит сказать отдельно, потому что тест выглядит странно, пока не
 * знаешь зачем. Тема обязана стоять на документе ДО первого кадра, а настройка
 * лежит в IndexedDB, которая отвечает асинхронно. Единственный выход — прочитать
 * зеркало из localStorage синхронным инлайн-скриптом в `index.html`, а тому
 * скрипту неоткуда импортировать: он выполняется раньше бандла. Значит, ключ
 * зеркала и оба цвета там записаны буквами. Разойтись эти копии могут молча — и
 * проявится это ровно тем миганием, ради которого скрипт и написан. Ловится
 * только чтением файла.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, THEME_MIRROR_KEY } from '../../src/db/repo/settings.js';
import type { ThemePref } from '../../src/db/schema.js';
import { THEME_COLOR, resolveTheme } from '../../src/ui/theme.js';

const INDEX_HTML = readFileSync(
  fileURLToPath(new URL('../../index.html', import.meta.url)),
  'utf8',
);

describe('resolveTheme', () => {
  it('явный выбор системную тему игнорирует', () => {
    for (const systemLight of [true, false]) {
      expect(resolveTheme('dark', systemLight)).toBe('dark');
      expect(resolveTheme('light', systemLight)).toBe('light');
    }
  });

  it('`system` следует за системой', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });

  it('никогда не отдаёт `system` наружу', () => {
    const prefs: ThemePref[] = ['dark', 'light', 'system'];
    for (const pref of prefs)
      for (const systemLight of [true, false])
        expect(['dark', 'light']).toContain(resolveTheme(pref, systemLight));
  });
});

describe('умолчание', () => {
  /* Тёмная, и это не вкусовщина: до BJ-9 темы не было вовсе, и установка,
     обновившаяся на новую версию, обязана выглядеть как вчера. */
  it('тёмная', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('dark');
  });
});

describe('инлайн-скрипт в index.html', () => {
  it('читает то же зеркало, что пишет приложение', () => {
    expect(INDEX_HTML).toContain(`'${THEME_MIRROR_KEY}'`);
  });

  it('знает оба цвета из THEME_COLOR', () => {
    expect(INDEX_HTML).toContain(THEME_COLOR.dark);
    expect(INDEX_HTML).toContain(THEME_COLOR.light);
  });

  it('понимает все три значения настройки', () => {
    for (const pref of ['dark', 'light', 'system']) expect(INDEX_HTML).toContain(`'${pref}'`);
  });

  it('не оставляет color-scheme тёмным намертво', () => {
    // Иначе светлому пользователю достанутся тёмные скроллбары и каретка.
    expect(INDEX_HTML).toContain('content="light dark"');
  });
});
