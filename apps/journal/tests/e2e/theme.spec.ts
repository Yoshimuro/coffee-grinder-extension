import { type Page, expect, test } from '@playwright/test';

/**
 * Тема — BJ-9.
 *
 * Проверяется здесь ровно то, чего не поймать юнит-тестом чистой функции:
 * доезжает ли выбор до документа и — главное — успевает ли он туда до первого
 * кадра после перезапуска.
 *
 * Второе и есть смысл файла. Настройка живёт в IndexedDB, которая отвечает
 * асинхронно, то есть уже после того, как браузер покрасил страницу. Чтобы
 * светлый пользователь не получал тёмную вспышку на каждом запуске, выбор
 * зеркалится в localStorage, а инлайн-скрипт в `index.html` читает зеркало
 * синхронно. Сломать эту цепочку можно тремя способами — забыть про зеркало в
 * `setTheme`, переименовать ключ с одной стороны, уронить скрипт исключением, —
 * и все три выглядят одинаково: «иногда моргает». Тест ниже ловит их тем, что
 * смотрит на атрибут в момент `domcontentloaded`, а не после `load`.
 *
 * Селекторы — `data-testid`: подписи чипов переводятся.
 */

function screen(page: Page, name: string) {
  return page.locator(`[data-screen="${name}"]`);
}

/** Открывает приложение на чистой базе и уходит в настройки. */
async function openSettings(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.removeItem('bj-theme');
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('brew-journal');
      req.onsuccess = req.onerror = req.onblocked = () => {
        resolve();
      };
    });
  });

  await page.goto('/');
  await expect(screen(page, 'home')).toBeVisible();
  // Вкладка — по подписи, как в смоуке цикла: своего `data-testid` у неё нет,
  // а язык на чистой базе всегда русский.
  await page.getByRole('button', { name: 'ЕЩЁ' }).click();
  await expect(screen(page, 'more')).toBeVisible();
}

test.describe('тема', () => {
  test('умолчание тёмное, выбор доезжает до документа', async ({ page }) => {
    await openSettings(page);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByTestId('set-theme-light').click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    /* Полоска браузера и панель задач установленной PWA красятся мета-тегом, а
       не CSS: если он останется тёмным, светлая тема будет в тёмной рамке. */
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#F7F7F4',
    );

    await page.getByTestId('set-theme-dark').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('светлая тема стоит уже на первом кадре после перезапуска', async ({ page }) => {
    await openSettings(page);
    await page.getByTestId('set-theme-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    /* `domcontentloaded`, а не `load`: к этому моменту бандл ещё не отработал, и
       атрибут может стоять только от инлайн-скрипта. Дождись мы `load` — тест
       проходил бы и без зеркала, то есть не проверял бы ничего. */
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('`system` следует за системной темой', async ({ page }) => {
    await openSettings(page);
    await page.getByTestId('set-theme-system').click();

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Смена системной темы на живом приложении обязана доезжать без перезапуска.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
