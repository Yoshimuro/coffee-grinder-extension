import { defineConfig, devices } from '@playwright/test';

/**
 * Сквозной смоук журнала (AC-2 задачи BJ-4).
 *
 * Сценарий один и большой намеренно: он проверяет не экран, а цикл — пачка,
 * заваривание, таймер, оценка, журнал, сравнение, настройки. Ровно этот путь
 * связывает пять групп между собой, и ломается он всегда на стыке, а не внутри
 * экрана; внутренности покрыты юнит-тестами чистых функций.
 *
 * Сервер — `vite dev`, а не `preview`: сборка пишет в общий `dist/`, а dev
 * поднимается с чистого листа и не мешает никому. Порт зафиксирован, чтобы
 * `?seed=demo` и origin базы IndexedDB были одинаковыми от прогона к прогону.
 *
 * Один браузер и один воркер: сценарий пишет в IndexedDB конкретного origin, и
 * параллельные воркеры делили бы одну базу.
 */

const PORT = 4319;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },

  /*
   * Размер экрана телефона, а не десктопа: раскладка рассчитана на 393×852, и
   * на 1280px она разъезжается так, что смоук перестаёт проверять то, что
   * увидит человек. `viewport` стоит ПОСЛЕ разворота `devices[...]` — иначе
   * пресет Desktop Chrome перебивает его своими 1280×720.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 393, height: 852 } },
    },
  ],

  webServer: {
    command: `npm run dev -w @coffee/journal -- --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    // Локально переиспользуем уже поднятый сервер, в CI — всегда свой.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: '../..',
  },
});
