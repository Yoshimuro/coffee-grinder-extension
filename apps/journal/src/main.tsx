/**
 * Entry point.
 *
 * The font is imported here, per subset and per weight, rather than through the
 * package's `index.css`: that barrel pulls every weight from 100 to 800 in both
 * styles across every subset, which is roughly forty files the app never uses.
 * Only 300/400/500/700 appear in the type scale, and only latin + cyrillic are
 * needed for a RU/EN app — so those eight files are what ships. Each of these
 * stylesheets references its `.woff2` relatively, so the bundle stays free of
 * network requests, which is the whole point (offline-first, no CDN).
 */

import '@fontsource/jetbrains-mono/latin-300.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/cyrillic-300.css';
import '@fontsource/jetbrains-mono/cyrillic-400.css';
import '@fontsource/jetbrains-mono/cyrillic-500.css';
import '@fontsource/jetbrains-mono/cyrillic-700.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// tokens.css before any component: ES imports execute in source order, and the
// screens' own stylesheets have to be able to override the base utilities at
// equal specificity rather than losing to whatever landed last.
import './ui/tokens.css';

import { seedDemo, wantsDemo } from './db/demo-seed.js';
import { seed } from './db/seed.js';
import { App } from './ui/App.js';

const host = document.getElementById('root');
if (!host) throw new Error('Не найден #root');

/*
 * Сид первого запуска, а следом — демо-данные, если их попросили строкой
 * `?seed=demo` (только в dev-сборке: `demoSeeds()` в проде отдаёт `null`).
 * Порядок важен: демо кладёт пачки и записи поверх уже готовых настроек, и
 * обгонять базовый сид ему нечем.
 *
 * Рендер этого не ждёт: на первом кадре ничто не зависит от базы, а блокировать
 * его на IndexedDB значило бы показать пустой экран на холодном старте.
 * Живые запросы Dexie сами перерисуют экраны, когда данные приедут.
 */
void seed()
  .then(() => (wantsDemo(window.location.search) ? seedDemo() : false))
  .catch((error: unknown) => {
    console.error('Сид не выполнен', error);
  });

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
