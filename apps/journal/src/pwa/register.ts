/**
 * Регистрация service worker'а — и четыре условия, без которых её не бывает.
 *
 * Условие, ради которого всё это написано отдельным модулем, — R-3: внутри APK
 * WebView Capacitor отдаёт страницу по схеме `https` с хоста `localhost`
 * (capacitor.config.ts объясняет почему). То есть проверка «мы в PWA» по
 * протоколу там срабатывает ложно, и без явного `!isNative()` приложение
 * зарегистрировало бы кеш поверх собственных ассетов APK: обновление сборки
 * перестало бы доезжать до экрана.
 *
 * Остальные три условия скучные, но обязательные:
 *   - только в собранной сборке: в `vite dev` файла `sw.js` нет вовсе, а
 *     зарегистрированный однажды воркер пережил бы перезапуск сервера и начал
 *     отдавать вчерашний бандл вместо горячей замены;
 *   - только в защищённом контексте: браузеры сами откажут где угодно, кроме
 *     `https` и `localhost`;
 *   - только там, где `serviceWorker` вообще есть.
 *
 * Проверки — чистая функция: их поведение важнее их удобства, и оно проверяется
 * тестом, а не запуском.
 */

import { isNative } from '../platform/native.js';

/** Ровно то, что нужно от `location`. */
export interface OriginInfo {
  protocol: string;
  hostname: string;
}

/** Файл воркера. Путь относительный — приложение живёт и в подкаталоге. */
export const SW_URL = './sw.js';

/**
 * Защищённый ли контекст.
 *
 * `127.0.0.1` и `::1` браузеры считают доверенными наравне с `localhost` —
 * список закрытый, догадываться тут не о чем.
 */
export function isSecureOrigin(origin: OriginInfo): boolean {
  if (origin.protocol === 'https:') return true;
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(origin.hostname);
}

export interface RegisterConditions {
  origin: OriginInfo;
  /** `Capacitor.isNativePlatform()`. */
  native: boolean;
  /** `import.meta.env.PROD`. */
  production: boolean;
  /** Есть ли `navigator.serviceWorker`. */
  supported: boolean;
}

export function shouldRegister(c: RegisterConditions): boolean {
  return c.supported && c.production && !c.native && isSecureOrigin(c.origin);
}

/**
 * Ставит воркер, если условия сошлись. Ошибки глотаются: офлайн-кеш — приятная
 * добавка к приложению, которое и так работает офлайн, а не его основа.
 */
export function registerServiceWorker(): void {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  if (
    !shouldRegister({
      origin: window.location,
      native: isNative(),
      production: import.meta.env.PROD,
      supported,
    })
  )
    return;

  navigator.serviceWorker.register(SW_URL, { updateViaCache: 'none' }).catch(() => undefined);
}
