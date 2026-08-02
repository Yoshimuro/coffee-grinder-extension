/**
 * Capacitor 6 — конфигурация обёртки (BJ-6, S-1).
 *
 * Читается только CLI (`cap sync`, `cap add`) и нативным слоем; в бандл не
 * попадает. Поэтому здесь можно ходить в `process.env`, а в `src/` — нельзя.
 *
 * `webDir: 'dist'` — тот же каталог, что собирает `vite build`, и никакой
 * промежуточной копии: `cap sync android` кладёт его в
 * `android/app/src/main/assets/public`.
 *
 * Схема `https` (умолчание Capacitor 6) вместо `file://`: без неё WebView
 * считает страницу небезопасным контекстом и отключает `crypto.subtle`,
 * OPFS и `navigator.mediaDevices`. Обратная сторона — внутри APK
 * `location.protocol === 'https:'`, то есть проверки «мы в PWA» по протоколу
 * там срабатывают ложно. Ровно поэтому регистрация service worker'а стоит
 * ещё и за `!isNativePlatform()` (R-3, `src/pwa/register.ts`).
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kovachar.brewjournal',
  appName: 'Brew Journal',
  webDir: 'dist',

  /* Фон окна до первого кадра WebView — тот же `--bg`, что у приложения
     (README, палитра). Со светлым умолчанием Capacitor старт мигал бы белым. */
  backgroundColor: '#0C0C0C',

  android: {
    backgroundColor: '#0C0C0C',
    /* Инспектор WebView — только когда его попросили переменной окружения:
       в релизной сборке он открывает содержимое приложения любому, у кого есть
       adb. `CAP_DEBUG=1 npx cap sync android` включает. */
    webContentsDebuggingEnabled: process.env.CAP_DEBUG === '1',
  },
};

export default config;
