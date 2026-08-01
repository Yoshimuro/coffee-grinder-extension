import type { Page } from '@playwright/test';
import { expect, selectGrinder, test } from './fixtures.js';

const JX_PRO = '1zpresso-jx-pro';
const C40 = 'comandante-c40-mk4';
const RED_CLIX = 'comandante-c40-red-clix';
const HARIO = 'hario-slim';
const TIMEMORE_C2 = 'timemore-c2';

/** Names a picker offers for a given query. */
async function optionNames(popup: Page, field: string, query: string): Promise<string[]> {
  await popup.getByTestId(`${field}-button`).click();
  await popup.getByTestId(`${field}-search`).fill(query);
  const names = await popup
    .getByTestId(`${field}-list`)
    .locator('li[role="option"]')
    .allTextContents();
  // Toggle shut rather than pressing Escape: an open panel would sit over the
  // other field's button and swallow the next click.
  await popup.getByTestId(`${field}-button`).click();
  return names;
}

test('loads the bundled dataset into both pickers', async ({ popup }) => {
  await expect(popup.getByTestId('dataset-meta')).toContainText('grinders');

  // Both pickers must offer the same catalogue — a converter that can read a
  // grinder but not write to it would be a silent gap.
  const from = await optionNames(popup, 'from-grinder', 'comandante');
  const to = await optionNames(popup, 'to-grinder', 'comandante');
  expect(from).toEqual(to);
  expect(from.length).toBeGreaterThan(0);
});

test('narrows the list as characters are typed', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  const search = popup.getByTestId('from-grinder-search');
  const options = popup.getByTestId('from-grinder-list').locator('li[role="option"]');

  await search.fill('c');
  const loose = await options.count();

  await search.fill('c40');
  const tight = await options.count();

  expect(tight).toBeLessThan(loose);
  await expect(options.first()).toContainText('C40');
});

test('reports when nothing matches', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  await popup.getByTestId('from-grinder-search').fill('zzzz');
  await expect(popup.getByTestId('from-grinder-list')).toContainText('No grinders match');
});

test('converts a setting between two grinders', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', JX_PRO);
  await selectGrinder(popup, 'to-grinder', C40);
  await popup.getByTestId('from-setting').fill('24');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  // 24 clicks x 12.5 um = 300 um; the C40 moves 30 um per click, so 10 clicks.
  await expect(popup.getByTestId('from-hint')).toContainText('300 µm');
  await expect(popup.getByTestId('result-value')).toHaveText('10');
  await expect(popup.getByTestId('result-unit')).toHaveText('clicks');
  await expect(popup.getByTestId('microns')).toContainText('300 µm');
});

test('classifies the resulting grind by brew method', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', JX_PRO);
  await selectGrinder(popup, 'to-grinder', C40);
  await popup.getByTestId('from-setting').fill('24');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  // 300 um sits inside the espresso band.
  await expect(popup.getByTestId('methods')).toContainText('Espresso');

  await popup.getByTestId('from-setting').fill('80');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  // 1000 um is French press / cold brew territory, not espresso.
  await expect(popup.getByTestId('methods')).toContainText('French press');
  await expect(popup.getByTestId('methods')).not.toContainText('Espresso');
});

test('stepper moves by exactly one detent and clamps at the ends', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', C40);
  await popup.getByTestId('from-setting').fill('10');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  await popup.getByTestId('setting-up').click();
  await expect(popup.getByTestId('from-setting')).toHaveValue('11');

  await popup.getByTestId('setting-down').click();
  await popup.getByTestId('setting-down').click();
  await expect(popup.getByTestId('from-setting')).toHaveValue('9');

  await popup.getByTestId('from-setting').fill('0');
  await popup.getByTestId('from-setting').dispatchEvent('change');
  await expect(popup.getByTestId('setting-down')).toBeDisabled();
});

test('warns when the target grinder cannot reach the grind size', async ({ popup }) => {
  // C40 at 60 clicks is 1800 um; the C2 tops out at 40 x 33 = 1320 um.
  await selectGrinder(popup, 'from-grinder', C40);
  await selectGrinder(popup, 'to-grinder', TIMEMORE_C2);
  await popup.getByTestId('from-setting').fill('60');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  const warning = popup.getByTestId('warning');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('cannot reach');
});

test('flags estimated calibrations instead of implying precision', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', JX_PRO);
  await selectGrinder(popup, 'to-grinder', HARIO);
  await popup.getByTestId('from-setting').fill('40');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  await expect(popup.getByTestId('warning')).toContainText('estimated');
});

test('shows a wider band for a less certain pairing', async ({ popup }) => {
  const bandWidth = async () => {
    const text = (await popup.getByTestId('result-band').textContent()) ?? '';
    const match = text.match(/range\s+([\d.]+)\s+–\s+([\d.]+)/);
    if (!match) return 0;
    return Number(match[2]) - Number(match[1]);
  };

  await selectGrinder(popup, 'from-grinder', JX_PRO);
  await popup.getByTestId('from-setting').fill('40');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  await selectGrinder(popup, 'to-grinder', RED_CLIX);
  const confident = await bandWidth();

  await selectGrinder(popup, 'to-grinder', HARIO);
  const uncertain = await bandWidth();

  // Both land near 500 um, but the Hario entry is only an estimate, so its
  // band must be proportionally wider in microns.
  expect(uncertain * 60).toBeGreaterThan(confident * 15);
});

test('remembers the last grinders and setting across popup opens', async ({ popup, context, extensionId }) => {
  await selectGrinder(popup, 'from-grinder', RED_CLIX);
  await selectGrinder(popup, 'to-grinder', JX_PRO);
  await popup.getByTestId('from-setting').fill('33');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  const reopened = await context.newPage();
  await reopened.goto(`chrome-extension://${extensionId}/popup.html`);
  await reopened.waitForSelector('body[data-ready="true"]');

  await expect(reopened.getByTestId('from-grinder')).toHaveAttribute('data-value', RED_CLIX);
  await expect(reopened.getByTestId('to-grinder')).toHaveAttribute('data-value', JX_PRO);
  await expect(reopened.getByTestId('from-setting')).toHaveValue('33');

  await reopened.close();
});

test('shows collapsed brands before anything is typed', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();

  const list = popup.getByTestId('from-grinder-list');
  // Brands are collapsed, so no model rows are visible yet.
  await expect(list.locator('li[role="option"]')).toHaveCount(0);
  await expect(list.locator('li.picker__group')).not.toHaveCount(0);

  await list.locator('li.picker__group[data-brand="Comandante"] button').click();
  await expect(list.locator('li[role="option"]')).not.toHaveCount(0);
  await expect(list).toContainText('C40 MK4 Nitro Blade');

  // Expanding re-renders the list, which detaches the clicked button mid-event.
  // The panel must not read that as a click outside itself.
  await expect(popup.getByTestId('from-grinder-search')).toBeVisible();
});

test('typing replaces the groups with a flat result list', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  const list = popup.getByTestId('from-grinder-list');

  await popup.getByTestId('from-grinder-search').fill('c40');
  await expect(list.locator('li.picker__group')).toHaveCount(0);
  await expect(list.locator('li[role="option"]')).not.toHaveCount(0);

  // Clearing the query brings the collapsed groups back.
  await popup.getByTestId('from-grinder-search').fill('');
  await expect(list.locator('li[role="option"]')).toHaveCount(0);
  await expect(list.locator('li.picker__group')).not.toHaveCount(0);
});
