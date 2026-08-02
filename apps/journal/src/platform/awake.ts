/**
 * «Экран не гаснет» — платформенный интерфейс и веб-реализация.
 *
 * Это обещание таймера: строка `t_awake` стоит у него в шапке, и если экран
 * всё-таки погаснет посреди пролива, оно окажется враньём. Блокировка ставится
 * на вход в экран таймера и снимается на выходе — держать её дольше значит
 * сажать батарею за чужой счёт.
 *
 * В браузере за это отвечает Screen Wake Lock API. Он есть не везде и требует
 * защищённого контекста, поэтому все отказы глотаются: не вышло — экран гаснет
 * как обычно, и это не повод показывать что-либо человеку.
 */

import { bind } from './native.js';

export interface ScreenLock {
  /** Держать экран включённым. Повторный вызов — не ошибка. */
  enter(): Promise<void>;
  /** Отпустить. Вызывается из уборки эффекта, поэтому бросать нельзя. */
  exit(): Promise<void>;
}

/**
 * Веб-реализация поверх Screen Wake Lock.
 *
 * Хендл приходится хранить: система сама снимает блокировку, когда вкладка
 * уходит в фон, и вернуть её можно только новым запросом. Отсюда же
 * подписка на `visibilitychange` — без неё таймер, переживший сворачивание,
 * возвращался бы уже без блокировки.
 */
export function createWebAwake(): ScreenLock {
  let sentinel: WakeLockSentinel | null = null;
  let wanted = false;

  const request = async (): Promise<void> => {
    if (!wanted || sentinel !== null) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      // Не защищённый контекст, вкладка в фоне, политика браузера — не важно.
      sentinel = null;
    }
  };

  const onVisible = (): void => {
    if (document.visibilityState === 'visible') void request();
  };

  return {
    async enter(): Promise<void> {
      wanted = true;
      document.addEventListener('visibilitychange', onVisible);
      await request();
    },

    async exit(): Promise<void> {
      wanted = false;
      document.removeEventListener('visibilitychange', onVisible);
      const held = sentinel;
      sentinel = null;
      await held?.release().catch(() => undefined);
    },
  };
}

/* ── Реализация, которую видят экраны ────────────────────────────────────── */

const lock = bind<ScreenLock>(createWebAwake, async () =>
  (await import('./awake.capacitor.js')).createCapacitorAwake(),
);

export const awake: ScreenLock = {
  enter: async () => {
    await (await lock()).enter();
  },
  exit: async () => {
    await (await lock()).exit();
  },
};
