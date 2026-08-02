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

  /*
   * Фон окна до первого кадра WebView. Значение одно на сборку — Capacitor
   * читает конфиг при синхронизации, и выбору темы оно следовать не умеет.
   *
   * Поэтому оно осталось тёмным: тёмная тема — умолчание приложения (BJ-9), и
   * человеку со светлой темой этот цвет не достаётся вовсе. На Android его
   * перекрывает `MainActivity`, красящий WebView цветом из `@color/bjBackground`
   * сразу после `super.onCreate`, а стартовое окно закрывает
   * `UiModeManager#setApplicationNightMode` (см. `ShellThemePlugin`).
   *
   * TODO(iOS): когда появится iOS-таргет, здесь нужна секция `ios` со своим
   * `backgroundColor`, и она упрётся в ту же одноразовость. Нативную часть темы
   * там придётся писать заново: `setStatusBarColor` на iOS не существует (полоса
   * прозрачна поверх WebView), вместо неё — `UIStatusBarStyle` и
   * `View controller-based status bar appearance` в `Info.plist`, а вместо
   * `values-night/` — светлый и тёмный варианты splash-сториборда.
   */
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
