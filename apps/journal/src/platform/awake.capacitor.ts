/**
 * «Экран не гаснет» на телефоне — `FLAG_KEEP_SCREEN_ON` через community-плагин.
 *
 * Флаг ставится на окно активности, поэтому система снимает его сама, когда
 * приложение уходит в фон, и возвращает при возврате — подписки на видимость,
 * как в вебе, здесь не нужно.
 *
 * `isSupported()` не спрашивается: на Android флаг есть всегда, а лишний вызов
 * через мост на входе в таймер — это лишняя задержка перед первым тиком.
 */

import { KeepAwake } from '@capacitor-community/keep-awake';

import type { ScreenLock } from './awake.js';

export function createCapacitorAwake(): ScreenLock {
  return {
    async enter(): Promise<void> {
      await KeepAwake.keepAwake().catch(() => undefined);
    },
    async exit(): Promise<void> {
      await KeepAwake.allowSleep().catch(() => undefined);
    },
  };
}
