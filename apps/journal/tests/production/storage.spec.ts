import { chromium, webkit, type Page } from '@playwright/test';
import { STR } from '../../src/data/strings.js';
import { test, expect, openJournal, workerControls } from './fixtures.js';

const BAG_PNG = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAgCAIAAACHPC9vAAAARklEQVR42mPoitKCIC0pITgiQ5CBKqZoSQkxUMUUkEFUMQXFIAoDi4EqpoACmyqmIGJtNPpHo380+kejfzT6R6N/NPqRBQHqae9AcMxQdQAAAABJRU5ErkJggg==';
const BEAN = 'Кофе после перезапуска';
const NOTE = 'Сохранено без интернета';

/** Compare every stored field and actual photo bytes, not only UI counts. */
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const data = await new Promise<Record<string, unknown[]>>((resolve, reject) => {
      const request = indexedDB.open('brew-journal');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const names = ['beans', 'entries', 'devices', 'grinders', 'settings'];
        const tx = db.transaction(names, 'readonly');
        const records: Record<string, unknown[]> = {};
        for (const name of names) {
          const read = tx.objectStore(name).getAll();
          read.onsuccess = () => { records[name] = read.result; };
        }
        tx.oncomplete = () => { db.close(); resolve(records); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
    const photos: { path: string; size: number; sha256: string }[] = [];
    const beans = data.beans as { photos: { path: string }[] }[];
    for (const bean of beans) for (const photo of bean.photos) {
      let blob: Blob;
      if (photo.path.startsWith('opfs:')) {
        const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('photos');
        blob = await (await dir.getFileHandle(photo.path.slice('opfs:'.length))).getFile();
      } else blob = await (await fetch(photo.path)).blob();
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      photos.push({ path: photo.path, size: blob.size, sha256: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('') });
    }
    return { data, photos };
  });
}

test('saved data and photo files survive offline writes, reload, browser process restart and cache clearing', async ({ site, browserName }, testInfo) => {
  test.setTimeout(60_000);
  const browserType = browserName === 'webkit' ? webkit : chromium;
  const profile = testInfo.outputPath('persistent-profile');
  let context = await browserType.launchPersistentContext(profile, { headless: true, viewport: { width: 393, height: 852 } });
  try {
    let page = context.pages()[0] ?? await context.newPage();
    await openJournal(page, site.url);
    await workerControls(page);
    site.state.online = false;
    // WebKit offline emulation bypasses workers (Playwright issue #42775).
    // The site's socket refusal still makes all app network access fail there.
    if (browserName === 'chromium') await context.setOffline(true);

    // All user records, including a real photo, are created with no network.
    await page.getByRole('button', { name: 'полка', exact: true }).click();
    await page.getByTestId('shelf-add').click();
    const choosing = page.waitForEvent('filechooser');
    await page.getByTestId('bean-photo-add').click();
    await (await choosing).setFiles({ name: 'bag.png', mimeType: 'image/png', buffer: Buffer.from(BAG_PNG, 'base64') });
    await expect(page.getByTestId('bean-photo-0')).toBeVisible();
    await page.getByTestId('bean-name').fill(BEAN);
    await page.getByTestId('bean-roast').fill('01.01.2026');
    await page.getByTestId('bean-save').click();
    await page.getByRole('button', { name: 'ещё', exact: true }).click();
    await page.getByTestId('set-theme-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByText('+ кофемолка', { exact: true }).click();
    await page.getByTestId('grinder-name').fill('Моя кофемолка');
    await page.getByTestId('grinder-save').click();
    await expect(page.getByTestId('grinder-row')).toHaveCount(2);
    const persisted = await page.evaluate(async () => navigator.storage?.persisted ? navigator.storage.persisted() : null);
    await expect(page.getByTestId('set-storage')).toContainText(persisted === null
      ? STR.ru.set_storage_unavailable
      : persisted ? STR.ru.set_storage_protected : STR.ru.set_storage_best_effort);

    await page.getByRole('button', { name: 'главный', exact: true }).click();
    await page.getByTestId('home-brew').click();
    await page.getByText('+ устройство', { exact: true }).click();
    await page.getByRole('button', { name: /V60/ }).click();
    await page.getByTestId('device-save').click();
    await page.getByTestId('recipe-dur-inc-0').click();
    await page.getByTestId('brew-manual').click();
    await page.getByTestId('brew-manual-plan').click();
    await page.getByTestId('brew-manual-save').click();
    await page.getByTestId('rate-now').click();
    await page.getByTestId('diag-acid-7').click();
    await page.getByTestId('diag-note').fill(NOTE);
    await page.getByTestId('diag-to-wheel').click();
    await page.getByTestId('wheel-mode-list').click();
    await page.getByTestId('wheel-list-chip-blueberry').click();
    await page.getByTestId('wheel-done').click();
    await page.getByTestId('diag-save').click();
    await expect(page.getByTestId('home-feed-row')).toHaveCount(1);

    const before = await snapshot(page);
    expect(before.data.entries).toHaveLength(1);
    expect(before.data.devices).toHaveLength(1);
    expect(before.photos).toHaveLength(1);
    expect(before.photos[0]!.size).toBeGreaterThan(0);
    expect(before.data.entries![0]).toMatchObject({ note: NOTE, diag: { acid: 7 }, desc: [['blueberry', 2]] });
    expect((before.data.entries![0] as { stages: unknown[] }).stages.length).toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByTestId('home-feed-row')).toHaveCount(1);
    expect(await snapshot(page)).toEqual(before);

    // This closes the browser PROCESS. A new process reads the on-disk profile;
    // no storageState snapshot or JS in-memory data is copied into it.
    await context.close();
    context = await browserType.launchPersistentContext(profile, { headless: true, offline: browserName === 'chromium', viewport: { width: 393, height: 852 } });
    page = context.pages()[0] ?? await context.newPage();
    await page.goto(site.url);
    await expect(page.getByTestId('home-feed-row')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await snapshot(page)).toEqual(before);
    await page.getByRole('button', { name: 'полка', exact: true }).click();
    const image = page.getByTestId('shelf-card').locator('img');
    await expect(image).toBeVisible();
    expect(await image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    // Cache-only cleanup is not the same operation as clearing website data.
    await context.setOffline(false);
    site.state.online = true;
    await page.evaluate(async () => {
      for (const key of await caches.keys()) await caches.delete(key);
    });
    if (browserName === 'chromium') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.clearBrowserCache');
    }
    await page.reload();
    await expect(page.getByTestId('home-feed-row')).toHaveCount(1);
    expect(await snapshot(page)).toEqual(before);
    site.state.online = false;
    if (browserName === 'chromium') await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('home-feed-row')).toHaveCount(1);
    expect(await snapshot(page)).toEqual(before);
    await testInfo.attach('storage-verification', {
      contentType: 'application/json',
      body: JSON.stringify({ browserName, persisted, photoStorage: before.photos[0]!.path.split(':')[0], tables: Object.fromEntries(Object.entries(before.data).map(([name, rows]) => [name, rows.length])), offlineReload: true, processRestart: true, cacheOnlyClear: true, offlineAfterCacheRepair: true }),
    });
  } finally {
    await context.close();
  }
});
