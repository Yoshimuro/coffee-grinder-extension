import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';
import type { Page } from '@playwright/test';
import { serviceWorker } from '../../build/pwa.js';
import { test, expect, openJournal, addBean, workerControls } from './fixtures.js';

test('production shell, icons and saved data survive offline reload', async ({ page, context, site, browserName }) => {
  await page.goto(`${site.origin}/setup.html`);
  await page.evaluate(async (url) => {
    const cache = await caches.open('another-pages-project');
    await cache.put(`${url}index.html`, new Response('Wrong application'));
    // Same application deployed under a different path must also survive.
    await caches.open(`brew-journal:${location.origin}/another-project/:old`);
  }, site.url);
  await openJournal(page, site.url);
  await workerControls(page);
  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    expect((await cdp.send('Page.getAppManifest')).errors).toEqual([]);
    expect((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
  }
  await addBean(page, 'Офлайн кофе');

  site.state.online = false; // Refuse all origin connections, including worker fetches.
  // WebKit's offline flag rejects even worker-generated responses (#42775).
  // Its check uses an unreachable origin; Chromium also sets browser offline.
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'полка', exact: true }).click();
  await expect(page.getByTestId('shelf-card')).toContainText('Офлайн кофе');
  expect(await page.evaluate(async () => {
    const paths = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
    return Promise.all(paths.map(async (path) => (await fetch(path, { cache: 'no-store' })).status));
  })).toEqual([200, 200, 200]);
  const keys = await page.evaluate(() => caches.keys());
  expect(keys).toContain('another-pages-project');
  expect(keys).toContain(`brew-journal:${site.origin}/another-project/:old`);
});

/** Small real Vite builds exercise stable-name changes, not a hand-written SW. */
async function release(root: string, revision: string, title: string, icon: string) {
  await mkdir(join(root, 'public'), { recursive: true });
  await writeFile(join(root, 'index.html'), `<!doctype html><title>${title}</title><h1>${title}</h1><script type="module" src="/app.js"></script>`);
  await writeFile(join(root, 'app.js'), "navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});");
  await writeFile(join(root, 'public', 'icon.txt'), icon);
  const directory = join(root, revision);
  await build({ configFile: false, root, base: './', logLevel: 'silent', plugins: [serviceWorker()], build: { outDir: directory } });
  return directory;
}

async function updateState(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return new Promise<string>((resolve, reject) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing!;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'redundant' || worker.state === 'installed') resolve(worker.state);
        });
      }, { once: true });
      registration.update().catch(reject);
    });
  });
}

async function clearShell(page: Page) {
  await page.evaluate(async () => {
    const prefix = `brew-journal:${(await navigator.serviceWorker.ready).scope}:`;
    for (const name of await caches.keys()) if (name.startsWith(prefix)) await caches.delete(name);
  });
}

test('HTML and public-file updates wait for open tabs, then replace only their own cache', async ({ page, context, site }, testInfo) => {
  const root = testInfo.outputPath('releases');
  const first = await release(root, 'v1', 'Version one', 'Icon one');
  const second = await release(root, 'v2', 'Version two', 'Icon one');
  const third = await release(root, 'v3', 'Version two', 'Icon two');
  expect(await readFile(join(first, 'sw.js'), 'utf8')).not.toBe(await readFile(join(second, 'sw.js'), 'utf8'));
  expect(await readFile(join(second, 'sw.js'), 'utf8')).not.toBe(await readFile(join(third, 'sw.js'), 'utf8'));

  site.state.directory = first;
  await page.goto(site.url);
  await workerControls(page);
  await page.evaluate(() => caches.open('unrelated').then(() => undefined));
  site.state.directory = third;
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Version one');
  await page.close();
  const next = await context.newPage();
  await next.goto(`${site.origin}/setup.html`);
  await expect.poll(() => next.evaluate(async (url) => {
    const registration = await navigator.serviceWorker.getRegistration(url);
    return registration?.waiting === null && registration.active?.state === 'activated';
  }, site.url)).toBe(true);
  site.state.online = false;
  await next.goto(site.url);
  await expect(next.locator('h1')).toHaveText('Version two');
  expect(await next.evaluate(() => fetch('icon.txt').then((r) => r.text()))).toBe('Icon two');
  const cacheNames = await next.evaluate(() => caches.keys());
  expect(cacheNames).toContain('unrelated');
  expect(cacheNames.filter((name) => name.startsWith(`brew-journal:${site.url}:`))).toHaveLength(1);
});

test('an incomplete update cannot replace the working offline version', async ({ page, site }, testInfo) => {
  const root = testInfo.outputPath('releases');
  site.state.directory = await release(root, 'v1', 'Working version', 'Icon one');
  await page.goto(site.url);
  await workerControls(page);
  site.state.directory = await release(root, 'v2', 'Incomplete version', 'Icon two');
  site.state.blocked.add('/coffee-grinder-extension/icon.txt');
  expect(await updateState(page)).toBe('redundant');
  site.state.online = false;
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Working version');
  expect(await page.evaluate(() => fetch('icon.txt').then((r) => r.text()))).toBe('Icon one');
});

test('a failed rollback preserves the cache still used by the active worker', async ({ page, site }, testInfo) => {
  const root = testInfo.outputPath('releases');
  const first = await release(root, 'v1', 'Version one', 'Icon one');
  const second = await release(root, 'v2', 'Version two', 'Icon two');
  site.state.directory = first;
  await page.goto(site.url);
  await workerControls(page);
  const originalCaches = await page.evaluate(() => caches.keys());

  site.state.directory = second;
  expect(await updateState(page)).toBe('installed');
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');

  // A is active, B is waiting, and the server rolls back to A. A's cache is
  // reused by the new installation, so deleting it on failure breaks A too.
  site.state.directory = first;
  site.state.blocked.add('/coffee-grinder-extension/icon.txt');
  expect(await updateState(page)).toBe('redundant');
  expect(await page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(originalCaches));

  site.state.online = false;
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Version one');
  expect(await page.evaluate(() => fetch('icon.txt').then((r) => r.text()))).toBe('Icon one');
});

test('an online visit restores the complete offline shell after cache clearing', async ({ page, site }, testInfo) => {
  site.state.directory = await release(testInfo.outputPath('releases'), 'v1', 'Restored version', 'Offline icon');
  await page.goto(site.url);
  await workerControls(page);
  await clearShell(page);

  await page.reload();
  await expect(page.locator('h1')).toHaveText('Restored version');
  site.state.online = false;
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Restored version');
  // Not requested by this HTML: recovery must rebuild the full precache.
  expect(await page.evaluate(() => fetch('icon.txt').then((r) => r.text()))).toBe('Offline icon');
});

test('an interrupted cache repair retries on the next online visit', async ({ page, site }, testInfo) => {
  site.state.directory = await release(testInfo.outputPath('releases'), 'v1', 'Retry version', 'Offline icon');
  await page.goto(site.url);
  await workerControls(page);
  await clearShell(page);
  site.state.blocked.add('/coffee-grinder-extension/icon.txt');
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Retry version');
  expect(await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).length))).reduce((sum, count) => sum + count, 0))).toBe(0);

  site.state.blocked.clear();
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Retry version');
  site.state.online = false;
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Retry version');
  expect(await page.evaluate(() => fetch('icon.txt').then((r) => r.text()))).toBe('Offline icon');
});

test('cache repair never mixes stable-name files from a different release', async ({ page, site }, testInfo) => {
  const root = testInfo.outputPath('releases');
  const first = await release(root, 'v1', 'Version one', 'Same icon');
  const second = await release(root, 'v2', 'Version two', 'Same icon');
  site.state.directory = first;
  await page.goto(site.url);
  await workerControls(page);
  await clearShell(page);
  site.state.directory = second;

  // Only HTML changes; all asset URLs still exist. A network fallback is OK,
  // but caching B's index.html under A's version would make a mixed release.
  expect(await page.evaluate(() => fetch('index.html').then((r) => r.text()))).toContain('Version two');
  expect(await page.evaluate(async () => !!await caches.match(new URL('index.html', location.href).href))).toBe(false);
});
