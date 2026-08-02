#!/usr/bin/env node
/**
 * Снимает журнал в обеих темах и пишет PNG в docs/screens/ (BJ-9).
 *
 *   npm run screenshot -w @coffee/journal
 *
 * Зачем скрипт вообще. Юнит-тесты журнала идут в node-окружении и рендера не
 * видят (`vitest.config.ts` говорит об этом прямо), а e2e проверяет поведение, а
 * не вид. Между ними остаётся дыра ровно того размера, куда помещается тема:
 * перепутанный токен не роняет ни один тест — он просто выглядит плохо. Эти
 * снимки и есть способ на него посмотреть, до и после правки.
 *
 * Отличие от `apps/extension/scripts/screenshot.mjs`, с которого списана
 * структура: расширение крутит `colorScheme` Playwright, потому что следует
 * системе. У журнала тема своя и явная, и подсунуть её эмуляцией медиа нельзя.
 *
 * Зеркала в localStorage тоже недостаточно, и это стоит знать заранее, иначе
 * светлая серия молча выйдет тёмной. Зеркало — только для кадра до старта
 * приложения; как только отвечает база, тему ставит она, а `?seed=demo`
 * записывает туда умолчание. Поэтому здесь тема выбирается так же, как её
 * выбирает человек: чипом в настройках.
 *
 * Сервер поднимается снаружи: `npm run dev:journal` на 4319 (тот же порт, что у
 * e2e), иначе скрипт скажет об этом и выйдет.
 */

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(PKG, '../..');
const OUT = join(REPO, 'docs', 'screens');

const BASE = process.env.JOURNAL_URL ?? 'http://localhost:4319';

/** Размер экрана телефона — тот же, что в `playwright.config.ts`. */
const VIEWPORT = { width: 393, height: 852 };

/**
 * Что снимаем.
 *
 * Набор выбран не по «главным экранам», а по тому, где тема может сломаться
 * по-разному: рампа целиком (спека), плотный список хайрлайнов (журнал),
 * крупный текст на пустом фоне (таймер), единственный цветной экран (колесо),
 * инверсная кнопка и чипы (настройки), заливка полосы (конвертер).
 */
const SHOTS = [
  { name: 'home', go: async () => undefined },
  { name: 'conv', go: (page) => byTest(page, 'home-conv') },
  { name: 'shelf', go: (page) => tab(page, 'ПОЛКА') },
  { name: 'log', go: (page) => tab(page, 'ЖУРНАЛ') },
  { name: 'more', go: (page) => tab(page, 'ЕЩЁ') },
  {
    name: 'spec',
    go: async (page) => {
      await tab(page, 'ЕЩЁ');
      await page.getByText('СПЕЦИФИКАЦИЯ').click();
    },
  },
  {
    name: 'wheel',
    go: async (page) => {
      await byTest(page, 'home-rate');
      await byTest(page, 'diag-to-wheel');
    },
  },
];

const tab = (page, label) => page.getByRole('button', { name: label }).click();
const byTest = (page, id) => page.getByTestId(id).click();

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const written = [];

for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  /* Демо-данные: на пустой базе половина экранов — это пустые состояния, а по
     ним про тему ничего не понять. */
  await page.goto(`${BASE}/?seed=demo`).catch(() => {
    throw new Error(`не отвечает ${BASE} — подними «npm run dev:journal» (порт 4319)`);
  });
  await page.waitForSelector('[data-screen="home"]');
  await page.getByTestId('home-feed-row').first().waitFor();

  /* Тема — чипом в настройках, тем же путём, что у человека. Выбор уходит в
     базу, и все последующие переходы уже идут в нужной теме. */
  await tab(page, 'ЕЩЁ');
  await byTest(page, `set-theme-${theme}`);
  await page.locator(`html[data-theme="${theme}"]`).waitFor();

  for (const shot of SHOTS) {
    await page.goto(`${BASE}/`);
    await page.waitForSelector('[data-screen="home"]');
    await shot.go(page);
    // Кадр после навигации: без паузы попадаются полупрорисованные списки.
    await page.waitForTimeout(250);

    const file = join(OUT, `journal-${shot.name}-${theme}.png`);
    await page.screenshot({ path: file });
    written.push(file.replace(`${REPO}/`, ''));
  }

  await context.close();
}

await browser.close();

console.log(`Снято ${String(written.length)} файлов:`);
for (const line of written) console.log('  ' + line);
