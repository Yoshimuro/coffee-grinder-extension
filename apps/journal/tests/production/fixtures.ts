import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test as base, expect, type Page } from '@playwright/test';

const PREFIX = '/coffee-grinder-extension/';
const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json',
};

/** No SPA fallback or dev transforms: missing deployment files really fail. */
export async function createSite(directory: string) {
  const state = { directory, online: true, blocked: new Set<string>() };
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (!state.online) {
      req.socket.destroy(); return;
    }
    if (state.blocked.has(pathname)) {
      res.writeHead(503); res.end('Unavailable asset'); return;
    }
    if (pathname === '/setup.html') {
      res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>Setup</title>'); return;
    }
    const root = resolve(state.directory);
    const filename = resolve(root, pathname.slice(PREFIX.length) || 'index.html');
    if (!pathname.startsWith(PREFIX) || !filename.startsWith(`${root}/`)) {
      res.writeHead(404); res.end(); return;
    }
    try {
      const content = await readFile(filename);
      res.writeHead(200, { 'content-type': MIME[extname(filename)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(content);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    state, origin, url: origin + PREFIX,
    close: () => new Promise<void>((done) => { server.close(() => done()); server.closeAllConnections(); }),
  };
}

export const test = base.extend<{ site: Awaited<ReturnType<typeof createSite>> }>({
  site: async ({}, use) => {
    const site = await createSite(fileURLToPath(new URL('../../dist/', import.meta.url)));
    try { await use(site); } finally { await site.close(); }
  },
});
export { expect };

export async function openJournal(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId('home-brew')).toBeVisible();
  // Keep onboarding overlays out of layout measurements; onboarding already
  // has its own functional coverage. Reload so Dexie sees the external write.
  await page.evaluate(() => new Promise<void>((done, reject) => {
    const request = indexedDB.open('brew-journal');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'hintsOn', value: false });
      tx.oncomplete = () => { db.close(); done(); };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  }));
  await page.reload();
  await expect(page.getByTestId('home-brew')).toBeVisible();
}

export async function addBean(page: Page, name: string) {
  await page.getByRole('button', { name: 'полка', exact: true }).click();
  await page.getByTestId('shelf-add').click();
  await page.getByTestId('bean-name').fill(name);
  await page.getByTestId('bean-roast').fill('01.01.2026');
  await page.getByTestId('bean-save').click();
  await expect(page.getByTestId('shelf-card').filter({ hasText: name })).toBeVisible();
}

export async function workerControls(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // An already-open document may still be uncontrolled during first activation.
  if (!await page.evaluate(() => !!navigator.serviceWorker.controller)) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}
