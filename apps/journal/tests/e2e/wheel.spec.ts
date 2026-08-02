import { type Page, expect, test } from '@playwright/test';

/**
 * Колесо вкусов — AC-2 задачи BJ-5.
 *
 * Сценарий проходит колесо так, как его проходит человек: из диагностики вглубь
 * по трём уровням, обратно крошками и центром, с остановкой на категории
 * («+ Фруктовое» — README:59, остановиться можно на любом уровне). Проверяется
 * не отрисовка, а стык: набранное на колесе обязано вернуться в диагностику
 * тем же составом и с той же интенсивностью — на этом стоит вся оценка.
 *
 * Геометрия, светлота и логика памяти покрыты юнит-тестами `wheel-view`; здесь
 * важно только то, что тестом чистой функции не поймать.
 *
 * Все селекторы — `data-testid`, как и в смоуке цикла: подписи меняются с
 * языком, классы — с вёрсткой.
 */

function screen(page: Page, name: string) {
  return page.locator(`[data-screen="${name}"]`);
}

/** Все сектора текущего уровня — по префиксу их `data-testid`. */
function sectors(page: Page) {
  return page.locator('[data-testid^="wheel-sector-"]');
}

/**
 * Открывает приложение с демо-данными. База чистится: `?seed=demo` кладёт
 * оценённые записи, а на них держатся точки памяти — чужой журнал сбил бы счёт.
 */
async function openApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('brew-journal');
      req.onsuccess = req.onerror = req.onblocked = () => {
        resolve();
      };
    });
  });

  await page.goto('/?seed=demo');
  await expect(screen(page, 'home')).toBeVisible();
  await expect(page.getByTestId('home-feed-row').first()).toBeVisible();
}

test.describe('колесо вкусов', () => {
  test('диагностика → категория → подкатегория → лист → ГОТОВО', async ({ page }) => {
    await openApp(page);

    /* ── В колесо ──────────────────────────────────────────────────────────
       Демо-журнал начинается с записи, ждущей оценки, — её карточка на главном
       и есть штатный вход в диагностику. */
    await page.getByTestId('home-rate').click();
    await expect(screen(page, 'diag')).toBeVisible();

    await page.getByTestId('diag-to-wheel').click();
    await expect(screen(page, 'wheel')).toBeVisible();

    /* ── Корень: девять категорий и память ─────────────────────────────────
       Дескрипторы оценённых записей демо-набора — черника, чёрная смородина,
       грейпфрут (фруктовое), мёд и карамель (сладкое), какао, фундук, грецкий
       орех (орехи и какао). Ровно три категории и должны быть отмечены. */
    await expect(sectors(page)).toHaveCount(9);
    await expect(page.getByTestId('wheel-mem-fruit')).toBeVisible();
    await expect(page.getByTestId('wheel-mem-sweet')).toBeVisible();
    await expect(page.getByTestId('wheel-mem-nutty')).toBeVisible();
    await expect(page.getByTestId('wheel-mem-green')).toHaveCount(0);
    await expect(page.getByTestId('wheel-mem-spice')).toHaveCount(0);

    // На корне наверх некуда, и добавлять нечего.
    await expect(page.getByTestId('wheel-up')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('wheel-add-here')).toHaveCount(0);
    await expect(page.getByTestId('wheel-picked')).toContainText('пока ничего');

    /* ── Уровень категории ─────────────────────────────────────────────────
       Шесть подкатегорий фруктового, и появилась кнопка «остановиться здесь». */
    await page.getByTestId('wheel-sector-fruit').click();
    await expect(sectors(page)).toHaveCount(6);
    await expect(page.getByTestId('wheel-crumb-1')).toHaveText('/ Фруктовое');

    const addHere = page.getByTestId('wheel-add-here');
    await expect(addHere).toHaveText('+ Фруктовое');

    /* «+ Фруктовое» кладёт саму категорию дескриптором — и предлагать её второй
       раз кнопке уже незачем. */
    await addHere.click();
    await expect(page.getByTestId('wheel-picked')).toContainText('Фруктовое');
    await expect(page.getByTestId('wheel-add-here')).toHaveCount(0);

    /* ── Уровень подкатегории и лист ───────────────────────────────────────
       Семь ягод; отмечены те две, что уже встречались в журнале. */
    await page.getByTestId('wheel-sector-berry').click();
    await expect(sectors(page)).toHaveCount(7);
    await expect(page.getByTestId('wheel-mem-blueberry')).toBeVisible();
    await expect(page.getByTestId('wheel-mem-blackcurrant')).toBeVisible();
    await expect(page.getByTestId('wheel-mem-raspberry')).toHaveCount(0);

    await page.getByTestId('wheel-sector-blueberry').click();
    await expect(page.getByTestId('wheel-sector-blueberry')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Тег внизу — с интенсивностью 2 по умолчанию (D-4 BJ-4).
    const picked = page.getByTestId('wheel-picked');
    const berry = picked.getByRole('button', { name: /Черника/ });
    await expect(berry).toContainText('●●○');

    // Тап по телу тега крутит интенсивность: 2 → 3.
    await berry.click();
    await expect(berry).toContainText('●●●');

    /* ── Крошки и центр возвращают наверх ──────────────────────────────────
       Крошка «Фруктовое» — на уровень подкатегорий, центр — ещё на уровень. */
    await page.getByTestId('wheel-crumb-1').click();
    await expect(sectors(page)).toHaveCount(6);
    await expect(page.getByTestId('wheel-sector-citrus')).toBeVisible();

    await page.getByTestId('wheel-up').click();
    await expect(sectors(page)).toHaveCount(9);
    await expect(page.getByTestId('wheel-sector-floral')).toBeVisible();

    /* ── ГОТОВО: набранное уезжает в диагностику ───────────────────────────── */
    await page.getByTestId('wheel-done').click();
    await expect(screen(page, 'diag')).toBeVisible();
    await expect(screen(page, 'diag')).toContainText('Фруктовое');
    await expect(screen(page, 'diag')).toContainText('Черника');
    // Интенсивность приехала той же, какой её оставили на колесе.
    await expect(
      screen(page, 'diag').getByRole('button', { name: /Черника/ }),
    ).toContainText('●●●');
  });

  test('крошка «ВСЁ» возвращает на корень с любой глубины', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('home-rate').click();
    await page.getByTestId('diag-to-wheel').click();
    await expect(screen(page, 'wheel')).toBeVisible();

    await page.getByTestId('wheel-sector-fruit').click();
    await page.getByTestId('wheel-sector-berry').click();
    await expect(sectors(page)).toHaveCount(7);

    await page.getByTestId('wheel-crumb-0').click();
    await expect(sectors(page)).toHaveCount(9);
    await expect(page.getByTestId('wheel-add-here')).toHaveCount(0);
  });
});
