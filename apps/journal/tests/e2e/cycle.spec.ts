import { type Page, expect, test } from '@playwright/test';

/**
 * Полный цикл журнала — AC-2 задачи BJ-4.
 *
 * Один сценарий проходит путь, ради которого приложение существует: завести
 * пачку, собрать рецепт, отсчитать заваривание с паузой, оценить остывшую чашку,
 * найти запись в журнале, сравнить с прошлой и прибраться в настройках.
 *
 * Проверяются стыки между группами, а не внутренности экранов: помол и зажимы
 * покрыты юнит-тестами чистых функций, а вот «новая пачка приехала в сетап
 * выбранной» или «оценка легла в ту запись, которую только что заварили»
 * проверить иначе нечем.
 *
 * Все селекторы — `data-testid`: подписи меняются вместе с языком, а классы —
 * вместе с вёрсткой.
 */

/** Экран, на котором сейчас приложение: у каждого свой `data-screen`. */
function screen(page: Page, name: string) {
  return page.locator(`[data-screen="${name}"]`);
}

/**
 * Открывает приложение с демо-данными и ждёт, пока сид доедет до экрана.
 *
 * База чистится перед каждым прогоном: IndexedDB переживает перезагрузку, и
 * без уборки второй запуск начинался бы с чужой полкой и чужим журналом.
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
  // Демо-журнал приезжает асинхронно — ждём его, а не фиксированную паузу.
  await expect(page.getByTestId('home-feed-row').first()).toBeVisible();
  // The first-run overlay appears after a short delay. Close it explicitly;
  // clicking a tab before that delay races the overlay on slower machines.
  await page.getByRole('button', { name: 'СКРЫТЬ ПОДСКАЗКИ', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'ПОДСКАЗКИ' })).not.toBeVisible();
}

test.describe('цикл заваривания', () => {
  test('пачка → сетап → таймер → оценка → журнал → сравнение → настройки', async ({ page }) => {
    await openApp(page);

    /* ── Пачка руками ──────────────────────────────────────────────────────
       Кнопка на полке одна — «ДОБАВИТЬ КОФЕ»; камера по ней не открывается,
       снимок при желании делают отдельным фото-слотом внутри формы, так что
       здесь до него дело не доходит и оговорка про headless-браузер не нужна. */
    await page.getByRole('button', { name: 'ПОЛКА' }).click();
    await expect(screen(page, 'shelf')).toBeVisible();

    /* Считать пачки можно только после того, как живой запрос Dexie ответил:
       иначе счётчик снимется с пустого экрана и «стало на одну больше» сойдётся
       с чем угодно. */
    await expect(page.getByTestId('shelf-card').first()).toBeVisible();
    const shelfBefore = await page.getByTestId('shelf-card').count();
    await page.getByTestId('shelf-add').click();
    await expect(screen(page, 'beanAdd')).toBeVisible();

    // Без даты обжарки пачка не заводится — на ней держится вся свежесть.
    // Без имени — тоже: с BJ-8 оно обязательно наравне с датой.
    await expect(page.getByTestId('bean-save')).toBeDisabled();

    await page.getByTestId('bean-roast').fill('27.07.2026');
    // Дата одна, без имени, гейт всё ещё держит: обе проверки нужны обеим сразу.
    await expect(page.getByTestId('bean-save')).toBeDisabled();
    await page.getByTestId('bean-name').fill('Тестовая Ява');
    await expect(page.getByTestId('bean-save')).toBeEnabled();
    await page.getByTestId('bean-save').click();

    // Вернулись на полку, и пачка на ней.
    await expect(screen(page, 'shelf')).toBeVisible();
    await expect(page.getByTestId('shelf-card')).toHaveCount(shelfBefore + 1);
    await expect(page.getByText('Тестовая Ява')).toBeVisible();

    /* ── Сетап ────────────────────────────────────────────────────────────── */
    await page.getByRole('button', { name: 'ГЛАВНЫЙ' }).click();
    await page.getByTestId('home-brew').click();
    await expect(screen(page, 'brew')).toBeVisible();

    // Выбираем именно свою пачку: автовыбор ставит первую на полке.
    await page.getByTestId('brew-bean').filter({ hasText: 'Тестовая Ява' }).click();
    await expect(
      page.getByTestId('brew-bean').filter({ hasText: 'Тестовая Ява' }),
    ).toHaveClass(/bj-brew__pick--on/);

    await page.getByTestId('brew-start').click();

    /* ── Таймер ────────────────────────────────────────────────────────────
       Стадии прощёлкиваются главной кнопкой; одна пауза посередине — она
       пишет в запись отдельную стадию и не должна ломать счёт остальных.

       Клики форсированные: таймер по устройству перерисовывается четыре раза в
       секунду (`TICK_MS = 250`), и строка отклонения меняет высоту блока, из-за
       чего проверка Playwright «элемент неподвижен» на работающем секундомере
       не сходится никогда. Видимость кнопки при этом проверяется отдельно —
       ожиданием самого экрана и локатором ниже. */
    await expect(screen(page, 'timer')).toBeVisible();

    const mainButton = page.getByTestId('timer-main');
    await expect(mainButton).toBeVisible();

    await mainButton.click({ force: true });
    await page.getByTestId('timer-pause').click({ force: true });
    await mainButton.click({ force: true });

    /* Дощёлкиваем до конца: сколько стадий осталось, знает генератор стадий, а
       не тест, — поэтому жмём, пока таймер не сменится на «оценку позже».
       Предел на случай, если кнопка перестанет продвигать таймер: без него
       тест висел бы до общего таймаута, ничего не объясняя. */
    for (let i = 0; i < 10 && !(await screen(page, 'rateLater').isVisible()); i++) {
      await mainButton.click({ force: true });
      await page.waitForTimeout(50);
    }

    await expect(screen(page, 'rateLater')).toBeVisible();

    /* ── Оценка ───────────────────────────────────────────────────────────── */
    await page.getByTestId('rate-now').click();
    await expect(screen(page, 'diag')).toBeVisible();

    await page.getByTestId('diag-acid-7').click();
    await page.getByTestId('diag-bitter-3').click();
    await page.getByTestId('diag-body-5').click();
    await page.getByTestId('diag-balance-8').click();
    await page.getByTestId('diag-note').fill('смоук: сладко, кислотность держит');
    await page.getByTestId('diag-save').click();

    // Сохранение уводит домой, и карточка «оценка ждёт» больше не про эту чашку.
    await expect(screen(page, 'home')).toBeVisible();

    /* ── Журнал ───────────────────────────────────────────────────────────── */
    await page.getByRole('button', { name: 'ЖУРНАЛ' }).click();
    await expect(screen(page, 'log')).toBeVisible();

    const brewed = page.getByTestId('log-row').filter({ hasText: 'Тестовая Ява' });
    await expect(brewed).toHaveCount(1);
    // Оценка проставилась: «С 8» — сладость, которую поставили выше.
    await expect(brewed).toContainText('С 8');

    /* ── Деталь ───────────────────────────────────────────────────────────── */
    await brewed.click();
    await expect(screen(page, 'detail')).toBeVisible();
    await expect(page.getByText('смоук: сладко, кислотность держит')).toBeVisible();
    // «ПОВТОРИТЬ» есть у заваривания — значит, рецепт записан целиком.
    await expect(page.getByTestId('detail-repeat')).toBeVisible();

    /* ── Сравнение двух записей ─────────────────────────────────────────────
       Назад — кнопкой «←», а не вкладкой: деталь вложена в журнал, и нижней
       навигации на ней нет (вкладки рисуются только на корневых экранах). */
    await page.getByRole('button', { name: 'НАЗАД' }).click();
    await expect(screen(page, 'log')).toBeVisible();

    await page.getByTestId('log-compare').click();
    await page.getByTestId('log-row').nth(0).click();
    await page.getByTestId('log-row').nth(1).click();
    await page.getByTestId('log-compare-open').click();

    await expect(screen(page, 'compare')).toBeVisible();
    // Строки §9 на месте — сравнение собралось, а не упало на пустой паре.
    await expect(page.getByText('ПОМОЛ', { exact: false }).first()).toBeVisible();

    /* ── Настройки: кофемолка ───────────────────────────────────────────────
       Сравнение тоже вложено — сначала «←» на журнал, и только оттуда вкладка. */
    await page.getByRole('button', { name: 'НАЗАД' }).click();
    await expect(screen(page, 'log')).toBeVisible();

    await page.getByRole('button', { name: 'ЕЩЁ' }).click();
    await expect(screen(page, 'more')).toBeVisible();

    // Как и на полке: считаем только после ответа живого запроса. Первый
    // запуск сеет ровно одну кофемолку, так что список пустым не бывает.
    await expect(page.getByTestId('grinder-row').first()).toBeVisible();
    const grindersBefore = await page.getByTestId('grinder-row').count();

    await page.getByText('+ КОФЕМОЛКА').click();
    await expect(page.getByTestId('grinder-form')).toBeVisible();
    await page.getByTestId('grinder-name').fill('Смоук C40');
    await page.getByTestId('grinder-save').click();

    await expect(page.getByTestId('grinder-row')).toHaveCount(grindersBefore + 1);
    await expect(page.getByText('Смоук C40')).toBeVisible();

    // Удаление с подтверждением: сначала вопрос, потом «ДА».
    const added = page.getByTestId('grinder-row').filter({ hasText: 'Смоук C40' });
    await added.getByTestId('grinder-delete').click();
    await added.getByTestId('grinder-delete-yes').click();

    await expect(page.getByTestId('grinder-row')).toHaveCount(grindersBefore);
    await expect(page.getByText('Смоук C40')).toHaveCount(0);
  });

  test('последнюю кофемолку удалить нельзя', async ({ page }) => {
    await openApp(page);

    await page.getByRole('button', { name: 'ЕЩЁ' }).click();
    await expect(screen(page, 'more')).toBeVisible();

    // Первый запуск сеет ровно одну молку — кнопки удаления у неё нет вовсе:
    // пустой список сломал бы и конвертер, и сетап.
    await expect(page.getByTestId('grinder-row')).toHaveCount(1);
    await expect(page.getByTestId('grinder-delete')).toHaveCount(0);
  });
  /*
   * Правка записи «карандашиком» (BJ-12). Юниты знают про диапазоны и патчи,
   * но не про стык: ✎ из ленты обязан открыть запись уже в режиме правки, а
   * «ПЕРЕОЦЕНИТЬ» — вернуться в неё же, а не на главную.
   */
  test('✎ из ленты → правка параметров → переоценка → возврат в запись', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('home-feed-edit').first().click();
    await expect(screen(page, 'detail')).toBeVisible();
    // Режим правки включён сразу: ячейки уже со степперами.
    await expect(page.getByTestId('detail-inc-water')).toBeVisible();

    const water = page.locator('.jr-param').filter({ hasText: 'ВОДА' });
    const before = await water.locator('.jr-param__value').innerText();
    await page.getByTestId('detail-inc-water').click();
    await expect(water.locator('.jr-param__value')).not.toHaveText(before);

    /* Переоценка приходит с предзаполненной заметкой и дескрипторами записи, а
       «СОХРАНИТЬ» возвращает назад по стеку — в ту же запись. */
    await page.getByTestId('detail-rerate').click();
    await expect(screen(page, 'diag')).toBeVisible();
    await page.getByTestId('diag-save').click();
    await expect(screen(page, 'detail')).toBeVisible();

    // Правка воды пережила переоценку: оценка пишет свои поля, а не всю запись.
    await expect(water.locator('.jr-param__value')).not.toHaveText(before);
  });
});
