#!/usr/bin/env node
/**
 * Renders the popup in a few representative states and writes PNGs to
 * docs/screens/. Useful for review and for the store listing later.
 *
 *   node scripts/screenshot.mjs
 */

import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXT = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs', 'screens');

const manifest = JSON.parse(readFileSync(join(EXT, 'manifest.json'), 'utf8'));
const { grinders: catalogue } = JSON.parse(
  readFileSync(join(ROOT, 'src', 'generated', 'dataset.json'), 'utf8'),
);
const digest = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest();
const id = [...digest.subarray(0, 16)]
  .flatMap((b) => [b >> 4, b & 0x0f])
  .map((n) => String.fromCharCode(97 + n))
  .join('');

const STATES = [
  { name: '01-espresso-jxpro-to-c40', from: '1zpresso-jx-pro', to: 'comandante-c40-mk4', setting: 24 },
  { name: '02-filter-c40-to-kplus', from: 'comandante-c40-mk4', to: '1zpresso-k-plus', setting: 28 },
  { name: '03-out-of-range', from: 'comandante-c40-mk4', to: 'timemore-c2', setting: 60 },
  { name: '04-estimated-calibration', from: '1zpresso-jx-pro', to: 'hario-slim', setting: 40 },
  { name: '05-electric-anchors', from: '1zpresso-j-max', to: 'fellow-ode-gen2', setting: 90 },
];

mkdirSync(OUT, { recursive: true });

for (const scheme of ['light', 'dark']) {
  const profile = mkdtempSync(join(tmpdir(), 'cgc-shot-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
    colorScheme: scheme,
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox'],
  });

  for (const state of STATES) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 340, height: 460 });
    await page.goto(`chrome-extension://${id}/popup.html`);
    await page.waitForSelector('body[data-ready="true"]');

    // The picker is a custom widget, not a <select>: open it, type the name to
    // narrow the list, then click the row. The name comes from the dataset
    // because a slug joins words the name keeps apart — "fellow-ode-gen2"
    // typed as-is matches nothing against "Ode Gen 2".
    for (const [field, id] of [
      ['from-grinder', state.from],
      ['to-grinder', state.to],
    ]) {
      const grinder = catalogue.find((g) => g.id === id);
      if (!grinder) throw new Error(`no grinder with id "${id}" in the built dataset`);
      await page.getByTestId(`${field}-button`).click();
      await page.getByTestId(`${field}-search`).fill(`${grinder.brand} ${grinder.model}`);
      await page.getByTestId(`${field}-list`).locator(`li[data-id="${id}"]`).click();
    }
    await page.getByTestId('from-setting').fill(String(state.setting));
    await page.getByTestId('from-setting').dispatchEvent('change');
    await page.waitForTimeout(120);

    const file = join(OUT, `${state.name}-${scheme}.png`);
    await page.locator('.app').screenshot({ path: file });
    console.log(`wrote ${file.replace(`${ROOT}/`, '')}`);
    await page.close();
  }

  await context.close();
  rmSync(profile, { recursive: true, force: true });
}
