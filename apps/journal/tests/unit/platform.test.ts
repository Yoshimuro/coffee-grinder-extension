/**
 * Платформенный слой — то, что в нём есть чистого.
 *
 * Сами реализации проверяются устройством: камеру, файлы и распознавание в Node
 * не запустить, и мокать их значило бы проверять моки. А вот правила — через
 * сколько напоминать, какой локалью звать движок, что считать защищённым
 * контекстом — правила продукта, и они обязаны держаться тестом.
 */

import { describe, expect, it } from 'vitest';

import { RATING_DELAY_MIN, createWebNotify, ratingDueAt } from '../../src/platform/notify.js';
import { createWebSpeech, localeOf } from '../../src/platform/speech.js';
import { bind, isNative } from '../../src/platform/native.js';

describe('напоминание об оценке (D-4)', () => {
  it('ставится через пятнадцать минут после «ПОЗЖЕ»', () => {
    expect(RATING_DELAY_MIN).toBe(15);

    const from = new Date('2026-07-30T09:00:00.000Z');
    expect(ratingDueAt(from).toISOString()).toBe('2026-07-30T09:15:00.000Z');
  });

  it('в вебе не ставится вовсе и молчит об этом', async () => {
    const notifier = createWebNotify();
    await expect(
      notifier.schedule({ title: 'ОЦЕНКА ЖДЁТ', body: 'кофе остыл', at: new Date() }),
    ).resolves.toBeUndefined();
    await expect(notifier.cancel()).resolves.toBeUndefined();
  });
});

describe('голосовой ввод', () => {
  it('локаль движка — по языку интерфейса', () => {
    expect(localeOf('ru')).toBe('ru-RU');
    expect(localeOf('en')).toBe('en-US');
  });

  it('в вебе распознавания нет, и кнопка не появляется', async () => {
    const speech = createWebSpeech();
    expect(await speech.available()).toBe(false);
    expect(await speech.listen('ru')).toBeNull();
  });
});

describe('выбор реализации', () => {
  it('вне Capacitor платформа не нативная', () => {
    expect(isNative()).toBe(false);
  });

  it('в вебе берёт веб-реализацию и не трогает нативную', async () => {
    let natives = 0;
    const get = bind(
      () => 'веб',
      () => {
        natives++;
        return Promise.resolve('телефон');
      },
    );

    expect(await get()).toBe('веб');
    expect(natives).toBe(0);
  });

  it('выбирает один раз и запоминает', async () => {
    let builds = 0;
    const get = bind(
      () => {
        builds++;
        return { n: builds };
      },
      () => Promise.reject(new Error('не сюда')),
    );

    const first = await get();
    const second = await get();
    expect(second).toBe(first);
    expect(builds).toBe(1);
  });
});
