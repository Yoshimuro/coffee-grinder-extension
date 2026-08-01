import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';

export const EXTENSION_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

/**
 * Chrome derives an extension's ID from its public key: SHA-256 the DER bytes,
 * then map each nibble of the first 16 onto 'a'-'p'. Because the manifest pins
 * a `key`, the ID is identical on every machine — so tests can address
 * `chrome-extension://` URLs directly. Playwright blocks `chrome://extensions`,
 * and this extension has no service worker to read an ID from, so deriving it
 * from the manifest is the one route that stays honest about what shipped.
 */
export function extensionId(): string {
  const manifest = JSON.parse(
    readFileSync(join(EXTENSION_PATH, 'manifest.json'), 'utf8'),
  ) as { key?: string };

  if (!manifest.key) {
    throw new Error('dist/manifest.json has no "key" — the extension ID would not be stable');
  }

  const digest = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest();
  return [...digest.subarray(0, 16)]
    .flatMap((byte) => [byte >> 4, byte & 0x0f])
    .map((nibble) => String.fromCharCode(97 + nibble))
    .join('');
}

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  popup: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({ headless }, use) => {
    // Extensions require a persistent profile; a throwaway one per worker keeps
    // chrome.storage.local isolated so tests cannot leak state into each other.
    const userDataDir = mkdtempSync(join(tmpdir(), 'cgc-profile-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless,
      // Playwright's default headless build is `chromium_headless_shell`, which
      // silently ignores --load-extension. The full Chromium channel supports
      // extensions in new-headless mode, so tests exercise the real thing.
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });

    await use(context);

    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  },

  extensionId: async ({ context: _context }, use) => {
    await use(extensionId());
  },

  popup: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    // The popup renders asynchronously because it awaits stored prefs first.
    await page.waitForSelector('body[data-ready="true"]');
    await use(page);
    await page.close();
  },
});

export const expect = test.expect;

/**
 * Query that reaches a grinder in the picker.
 *
 * Derived from the shipped name rather than from the id: a slug joins words the
 * name keeps apart, so "fellow-ode-gen2" searched as typed matches nothing —
 * the catalogue says "Ode Gen 2".
 */
function queryFor(id: string): string {
  const dataset = JSON.parse(
    readFileSync(join(EXTENSION_PATH, '..', 'src/generated/dataset.json'), 'utf8'),
  ) as { grinders: Array<{ id: string; brand: string; model: string }> };

  const grinder = dataset.grinders.find((g) => g.id === id);
  if (!grinder) throw new Error(`no grinder with id "${id}" in the built dataset`);
  return `${grinder.brand} ${grinder.model}`;
}

/** Pick a grinder by id through the real widget: open, type, click. */
export async function selectGrinder(
  popup: Page,
  field: 'from-grinder' | 'to-grinder',
  id: string,
): Promise<void> {
  await popup.getByTestId(`${field}-button`).click();
  await popup.getByTestId(`${field}-search`).fill(queryFor(id));
  await popup.getByTestId(`${field}-list`).locator(`li[data-id="${id}"]`).click();
  await expect(popup.getByTestId(field)).toHaveAttribute('data-value', id);
}
