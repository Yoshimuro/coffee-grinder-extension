import { expect, test } from '@playwright/test';

test('first coffee and highlighted actions keep their real meaning', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('home-welcome')).toContainText('добавь кофе');
  await expect(page.getByTestId('home-brew')).toHaveText('добавить кофе');
  // Wait beyond the delayed first-use discovery: the empty home must stay quiet.
  await page.waitForTimeout(900);
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.getByTestId('home-brew').click();
  await expect(page.locator('[data-screen="beanAdd"]')).toBeVisible();
  await expect(page.getByTestId('hint-text')).toContainText('укажи, какой у тебя кофе');

  const before = await page.getByTestId('hint-text').textContent();
  await page.mouse.click(300, 25); // blank header, not an action
  await expect(page.getByTestId('hint-text')).toHaveText(before!);
  // No force click: the actual highlighted control must receive the tap.
  await page.getByRole('button', { name: 'молотый', exact: true }).click();
  await expect(page.getByRole('button', { name: 'молотый', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.getByRole('button', { name: 'зерно', exact: true }).click();
  await page.getByTestId('bean-roast').fill('28.10.2026');
  await page.getByTestId('bean-name').fill('Первое приготовление');
  await page.getByTestId('bean-save').click();
  await expect(page.getByTestId('home-brew')).toHaveText('заварить кофе');
  await expect(page.getByTestId('hint-text')).toContainText('заварить кофе');
  await page.screenshot({ path: testInfo.outputPath('actionable-hint.png') });
  await page.getByTestId('home-brew').click();
  await expect(page.locator('[data-screen="brew"]')).toBeVisible();
  await expect(page.getByTestId('hint-text')).not.toContainText('заварить кофе');
  await page.getByTestId('brew-start').click();
  await expect(page.locator('[data-screen="timer"]')).toBeVisible();
  for (let i = 0; i < 8; i++) {
    const main = page.getByTestId('timer-main');
    await expect(main).toBeVisible();
    const saves = (await main.innerText()).includes('сохранить');
    const box = (await main.boundingBox())!;
    // The timer updates every 250 ms. A real coordinate click avoids waiting
    // for animated layout stability without bypassing the browser's hit test.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (saves) break;
    await page.waitForTimeout(50);
  }
  await expect(page.locator('[data-screen="rateLater"]')).toBeVisible();
  await expect(page.getByTestId('hint-text')).toHaveText('приготовление уже записано в журнал. оценить чашку можно сейчас или позже с главного экрана');
  await page.screenshot({ path: testInfo.outputPath('close-tip.png') });
  await page.getByRole('button', { name: 'закрыть подсказку', exact: true }).click();
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await expect(page.locator('[data-screen="rateLater"]')).toBeVisible();
  await expect(page.getByTestId('rate-later')).toBeVisible();
});

test('secondary navigation text meets contrast in both themes', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('home-welcome')).toBeVisible();
  for (const theme of ['dark', 'light'] as const) {
    if (theme === 'light') {
      await page.getByRole('button', { name: 'ещё', exact: true }).click();
      await page.getByTestId('hint-hide').click();
      await page.getByTestId('set-theme-light').click();
      await page.getByRole('button', { name: 'главный', exact: true }).click();
      await expect(page.getByTestId('home-welcome')).toBeVisible();
    }
    const ratios = await page.locator('.tab').evaluateAll((tabs) => {
      const rgb = (s: string) => s.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const luminance = (c: number[]) => c.map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const background = luminance(rgb(getComputedStyle(document.body).backgroundColor));
      return tabs.map((tab) => {
        const foreground = luminance(rgb(getComputedStyle(tab).color));
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
    });
    expect(ratios).toHaveLength(4);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: testInfo.outputPath(`first-use-${theme}.png`) });
  }
});
