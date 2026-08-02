import { createHash } from 'node:crypto';

import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

/**
 * Service worker пишется здесь, а не лежит файлом в `public/`.
 *
 * Причина простая: precache — это список имён собранных файлов, а имена
 * содержат хеш содержимого и до сборки неизвестны. Плагин узнаёт их из бандла и
 * зашивает в воркер вместе с версией кеша, посчитанной от того же списка, —
 * поэтому новая сборка автоматически получает новый кеш, а старый удаляется при
 * активации.
 *
 * Workbox не подключён намеренно (S-5): он тянет собственный рантайм и
 * генератор ради стратегий, из которых здесь нужна ровно одна — «сначала кеш».
 * Приложение и так офлайн-first: данные лежат в IndexedDB, шрифты в бандле,
 * сетевых запросов нет ни одного. Воркер добавляет к этому только запуск без
 * сети.
 */
function serviceWorker(): Plugin {
  return {
    name: 'bj-service-worker',
    apply: 'build',

    generateBundle(_options, bundle) {
      /* `index.html` добавляется руками: в этот момент он в бандле может ещё не
         появиться, а без него офлайн-запуск невозможен. Дубликаты убирает Set. */
      const files = new Set(['index.html', ...Object.keys(bundle)]);
      const assets = [...files].sort().map((name) => `./${name}`);
      const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);

      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(version, assets) });
    },
  };
}

/**
 * Тело воркера.
 *
 * Стратегия одна: сначала кеш, потом сеть. Сети у приложения нет, поэтому
 * «потом» здесь — не запасной путь к серверу, а честный ответ браузеру про
 * файл, которого в кеше почему-то не оказалось.
 *
 * Навигация отвечает `index.html` из кеша: у приложения один документ и своя
 * навигация внутри, так что любой адрес в его области — это он.
 */
function swSource(version: string, assets: readonly string[]): string {
  return `/* Сгенерировано vite.config.ts (BJ-6). Правки — там: сборка затрёт этот файл. */
const CACHE = 'brew-journal-${version}';
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // По одному, а не addAll: один неудачный файл не должен отменять весь
      // кеш — приложение обязано запуститься офлайн хотя бы частично.
      await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Чужой origin не кешируется и не проксируется: приложение в сеть не ходит,
  // и воркер не должен становиться дырой, через которую оно туда попадёт.
  if (new URL(request.url).origin !== self.location.origin) return;

  const target = request.mode === 'navigate' ? './index.html' : request;
  event.respondWith(caches.match(target).then((hit) => hit || fetch(request)));
});
`;
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  // The bundle has to run from `file://` inside a Capacitor WebView (BJ-6), so
  // every emitted reference is relative rather than root-absolute.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Android WebView floor for Capacitor 6.
    target: 'es2022',
    // The font faces must stay as real files: inlining them as data URIs would
    // push the CSS past a megabyte and defeat per-subset caching.
    assetsInlineLimit: 4096,
  },
});
