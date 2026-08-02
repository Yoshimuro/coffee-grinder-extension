import { type Page, expect, test } from '@playwright/test';

/**
 * Обмен базой — AC-3 задачи BJ-6.
 *
 * Сценарий проверяет обещание контракта №2 целиком и ровно тем путём, которым
 * им пользуется человек: завести пачку со снимком, выгрузить базу файлом,
 * стереть профиль дочиста и вернуть всё импортом того же файла.
 *
 * Именно поэтому здесь снимок, а не только записи: фото — единственное, что
 * живёт вне Dexie (в вебе — в OPFS), и единственное, что молча потеряется, если
 * zip собрать неправильно. Текст пережил бы и наивную выгрузку JSON'а.
 *
 * «Чистый профиль» делается удалением IndexedDB и перезагрузкой без `?seed=demo`
 * — то есть первым запуском приложения, а не подчисткой таблиц: импорт обязан
 * уметь наполнить пустое, а не только заменить похожее.
 */

/** Снимок пачки: 24×32 PNG. Настоящий файл, а не заглушка, — его пережмёт канвас. */
const BAG_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAgCAIAAACHPC9vAAAARklEQVR42mPoitKCIC0pITgiQ5CBKqZoSQkxUMUUkEFUMQXFIAoDi4EqpoACmyqmIGJtNPpHo380+kejfzT6R6N/NPqRBQHqae9AcMxQdQAAAABJRU5ErkJggg==';

const BEAN_NAME = 'Экспортная Ява';

function screen(page: Page, name: string) {
  return page.locator(`[data-screen="${name}"]`);
}

/**
 * Вкладка нижней навигации.
 *
 * `exact`, потому что на пустом журнале приглашение «Журнал пуст. Заварить
 * первую чашку» — тоже кнопка, и нестрогое совпадение цепляет обе.
 */
function tab(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

/** Стирает базу этого origin. Возвращает страницу на первый запуск. */
async function wipe(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('brew-journal');
      req.onsuccess = req.onerror = req.onblocked = () => {
        resolve();
      };
    });
  });
}

test.describe('экспорт и импорт базы', () => {
  test('пачка со снимком → zip → чистый профиль → импорт → всё на месте', async ({ page }) => {
    await page.goto('/');
    await wipe(page);
    await page.goto('/?seed=demo');
    await expect(screen(page, 'home')).toBeVisible();
    await expect(page.getByTestId('home-feed-row').first()).toBeVisible();

    /* ── Пачка со снимком ──────────────────────────────────────────────────
       Съёмка в вебе — скрытый `<input type=file>`, поэтому файл отдаётся через
       системный диалог, который Playwright перехватывает. */
    await tab(page, 'ПОЛКА').click();
    await expect(screen(page, 'shelf')).toBeVisible();
    await page.getByTestId('shelf-add').click();
    await expect(screen(page, 'beanAdd')).toBeVisible();

    const chooser = page.waitForEvent('filechooser');
    await page.getByTestId('bean-photo-add').click();
    await (
      await chooser
    ).setFiles({ name: 'bag.png', mimeType: 'image/png', buffer: Buffer.from(BAG_PNG, 'base64') });

    // Слот заполнился — значит, снимок ужат и записан в хранилище.
    await expect(page.getByTestId('bean-photo-0')).toBeVisible();

    await page.getByTestId('bean-roast').fill('27.07.2026');
    await page.getByTestId('bean-name').fill(BEAN_NAME);
    await page.getByTestId('bean-save').click();

    await expect(screen(page, 'shelf')).toBeVisible();
    await expect(page.getByText(BEAN_NAME)).toBeVisible();

    const shelfBefore = await page.getByTestId('shelf-card').count();

    await tab(page, 'ЖУРНАЛ').click();
    await expect(screen(page, 'log')).toBeVisible();
    await expect(page.getByTestId('log-row').first()).toBeVisible();
    const entriesBefore = await page.getByTestId('log-row').count();
    expect(entriesBefore).toBeGreaterThan(0);

    /* ── Экспорт ──────────────────────────────────────────────────────────── */
    await tab(page, 'ЕЩЁ').click();
    await expect(screen(page, 'more')).toBeVisible();

    const downloading = page.waitForEvent('download');
    await page.getByTestId('set-export').click();
    const download = await downloading;

    expect(download.suggestedFilename()).toBe('brew-journal-export.zip');
    const zipPath = await download.path();
    expect(zipPath).toBeTruthy();

    await expect(page.getByTestId('set-export')).toContainText('brew-journal-export.zip');

    /* ── Чистый профиль ───────────────────────────────────────────────────── */
    await wipe(page);
    await page.goto('/');
    await expect(screen(page, 'home')).toBeVisible();

    await tab(page, 'ЖУРНАЛ').click();
    await expect(screen(page, 'log')).toBeVisible();
    await expect(page.getByTestId('log-row')).toHaveCount(0);

    await tab(page, 'ПОЛКА').click();
    await expect(page.getByTestId('shelf-card')).toHaveCount(0);

    /* ── Импорт ───────────────────────────────────────────────────────────── */
    await tab(page, 'ЕЩЁ').click();
    await expect(screen(page, 'more')).toBeVisible();

    const picking = page.waitForEvent('filechooser');
    await page.getByTestId('set-import').click();
    await (await picking).setFiles(zipPath as string);

    await expect(page.getByTestId('set-import')).toContainText('база восстановлена из файла');

    /* ── Всё на месте ─────────────────────────────────────────────────────── */
    await tab(page, 'ЖУРНАЛ').click();
    await expect(page.getByTestId('log-row')).toHaveCount(entriesBefore);

    await tab(page, 'ПОЛКА').click();
    await expect(page.getByTestId('shelf-card')).toHaveCount(shelfBefore);
    await expect(page.getByText(BEAN_NAME)).toBeVisible();

    /* Снимок вернулся файлом, а не пустым местом: карточка показывает картинку,
       и её адрес — не пустая строка. */
    const shot = page
      .getByTestId('shelf-card')
      .filter({ hasText: BEAN_NAME })
      .locator('img')
      .first();
    await expect(shot).toBeVisible();
    expect(await shot.getAttribute('src')).toBeTruthy();
  });

  test('чужой файл отвергается, база не меняется', async ({ page }) => {
    await page.goto('/');
    await wipe(page);
    await page.goto('/?seed=demo');
    await expect(page.getByTestId('home-feed-row').first()).toBeVisible();

    await tab(page, 'ЖУРНАЛ').click();
    await expect(page.getByTestId('log-row').first()).toBeVisible();
    const before = await page.getByTestId('log-row').count();

    await tab(page, 'ЕЩЁ').click();
    const picking = page.waitForEvent('filechooser');
    await page.getByTestId('set-import').click();
    await (
      await picking
    ).setFiles({
      name: 'not-a-zip.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('это не архив', 'utf8'),
    });

    await expect(page.getByTestId('set-import')).toContainText('файл не читается');

    await tab(page, 'ЖУРНАЛ').click();
    await expect(page.getByTestId('log-row')).toHaveCount(before);
  });
});
