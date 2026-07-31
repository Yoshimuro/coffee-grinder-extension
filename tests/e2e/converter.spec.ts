import { expect, test } from './fixtures.js';

const JX_PRO = '1zpresso-jx-pro';
const C40 = 'comandante-c40-mk4';
const RED_CLIX = 'comandante-c40-red-clix';
const HARIO = 'hario-slim';
const TIMEMORE_C2 = 'timemore-c2';

test('loads the bundled dataset into both pickers', async ({ popup }) => {
  await expect(popup.getByTestId('dataset-meta')).toContainText('grinders');

  const options = popup.getByTestId('from-grinder').locator('option');
  await expect(options).not.toHaveCount(0);

  // Both selects must offer the same catalogue — a converter that can read a
  // grinder but not write to it would be a silent gap.
  const from = await popup.getByTestId('from-grinder').locator('option').allTextContents();
  const to = await popup.getByTestId('to-grinder').locator('option').allTextContents();
  expect(from).toEqual(to);
});

test('converts a setting between two grinders', async ({ popup }) => {
  await popup.getByTestId('from-grinder').selectOption(JX_PRO);
  await popup.getByTestId('to-grinder').selectOption(C40);
  await popup.getByTestId('from-setting').fill('24');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  // 24 clicks x 12.5 um = 300 um; the C40 moves 30 um per click, so 10 clicks.
  await expect(popup.getByTestId('from-hint')).toContainText('300 µm');
  await expect(popup.getByTestId('result-value')).toHaveText('10');
  await expect(popup.getByTestId('result-unit')).toHaveText('clicks');
  await expect(popup.getByTestId('microns')).toContainText('300 µm');
});

test('classifies the resulting grind by brew method', async ({ popup }) => {
  await popup.getByTestId('from-grinder').selectOption(JX_PRO);
  await popup.getByTestId('to-grinder').selectOption(C40);
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
  await popup.getByTestId('from-grinder').selectOption(C40);
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
  await popup.getByTestId('from-grinder').selectOption(C40);
  await popup.getByTestId('to-grinder').selectOption(TIMEMORE_C2);
  await popup.getByTestId('from-setting').fill('60');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  const warning = popup.getByTestId('warning');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('cannot reach');
});

test('flags estimated calibrations instead of implying precision', async ({ popup }) => {
  await popup.getByTestId('from-grinder').selectOption(JX_PRO);
  await popup.getByTestId('to-grinder').selectOption(HARIO);
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

  await popup.getByTestId('from-grinder').selectOption(JX_PRO);
  await popup.getByTestId('from-setting').fill('40');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  await popup.getByTestId('to-grinder').selectOption(RED_CLIX);
  const confident = await bandWidth();

  await popup.getByTestId('to-grinder').selectOption(HARIO);
  const uncertain = await bandWidth();

  // Both land near 500 um, but the Hario entry is only an estimate, so its
  // band must be proportionally wider in microns.
  expect(uncertain * 60).toBeGreaterThan(confident * 15);
});

test('remembers the last grinders and setting across popup opens', async ({ popup, context, extensionId }) => {
  await popup.getByTestId('from-grinder').selectOption(RED_CLIX);
  await popup.getByTestId('to-grinder').selectOption(JX_PRO);
  await popup.getByTestId('from-setting').fill('33');
  await popup.getByTestId('from-setting').dispatchEvent('change');

  const reopened = await context.newPage();
  await reopened.goto(`chrome-extension://${extensionId}/popup.html`);
  await reopened.waitForSelector('body[data-ready="true"]');

  await expect(reopened.getByTestId('from-grinder')).toHaveValue(RED_CLIX);
  await expect(reopened.getByTestId('to-grinder')).toHaveValue(JX_PRO);
  await expect(reopened.getByTestId('from-setting')).toHaveValue('33');

  await reopened.close();
});
