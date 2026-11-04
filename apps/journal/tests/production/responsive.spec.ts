import type { Page } from '@playwright/test';
import { test, expect, openJournal, addBean } from './fixtures.js';

async function fits(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.app, .screen__body, .bj-head, .tabs, .bj-stepper__value, .bj-rec__name')]
      .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({ className: el.className, width: el.clientWidth, scroll: el.scrollWidth })),
  );
  expect(overflow).toEqual([]);
}

test('journal, filled shelf, recipe and flavour wheel fit the viewport', async ({ page, site }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openJournal(page, site.url);
  await fits(page);
  const tabs = await page.locator('.tabs').boundingBox();
  const screen = await page.locator('[data-screen="home"]').boundingBox();
  expect(tabs).not.toBeNull();
  expect(screen).not.toBeNull();
  if (page.viewportSize()!.width >= 768) expect(tabs!.x + tabs!.width).toBeLessThanOrEqual(screen!.x + 1);
  else expect(tabs!.y).toBeGreaterThanOrEqual(screen!.y + screen!.height - 1);

  await addBean(page, 'Эфиопия — натуральная обработка');
  await addBean(page, 'Колумбия — мытая обработка');
  await fits(page);
  const cards = await page.getByTestId('shelf-card').all();
  const first = (await cards[0]!.boundingBox())!;
  const second = (await cards[1]!.boundingBox())!;
  if (page.viewportSize()!.width >= 1024) {
    expect(first.y).toBe(second.y);
    expect(first.x).not.toBe(second.x);
  } else expect(first.y).not.toBe(second.y);
  await page.screenshot({ path: testInfo.outputPath('shelf.png') });

  await page.getByRole('button', { name: 'главный', exact: true }).click();
  await page.getByTestId('home-brew').click();
  await page.getByText('+ устройство', { exact: true }).click();
  await page.getByRole('button', { name: /V60/ }).click();
  await page.getByTestId('device-save').click();
  await expect(page.getByTestId('brew-recipe')).toBeVisible();
  await fits(page);
  await page.getByTestId('brew-recipe').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('recipe.png') });
  // Verify an actual form control stays usable, not just its container bounds.
  await page.getByTestId('recipe-dur-inc-0').click();
  await fits(page);

  await page.getByRole('button', { name: 'назад', exact: true }).click();
  await page.getByTestId('home-conv').click();
  await fits(page);
  await page.getByRole('button', { name: 'назад', exact: true }).click();
  await page.getByTestId('home-taste').click();
  await page.getByTestId('diag-to-wheel').click();
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath('wheel.png') });
  for (const mode of ['map', 'canvas', 'list']) {
    await page.getByTestId(`wheel-mode-${mode}`).click();
    await fits(page);
  }
  await page.getByTestId('wheel-list-chip-blueberry').click();
  await page.getByTestId('wheel-done').click();
  await expect(page.locator('[data-screen="diag"]')).toContainText('черника');
  await fits(page);
  await page.getByTestId('diag-save').click();
  await page.getByRole('button', { name: 'ещё', exact: true }).click();
  await fits(page);
  await page.getByTestId('set-theme-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath('settings-light.png') });
  expect(errors).toEqual([]);
});
