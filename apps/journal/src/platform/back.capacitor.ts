/**
 * Системная «назад» на телефоне — плагин `@capacitor/app`.
 *
 * Сама подписка и отменяет поведение по умолчанию: пока слушателя
 * `backButton` нет, Capacitor закрывает приложение сам. Отписки нет намеренно —
 * слушатель ставится на весь срок жизни процесса, снимать его некому и незачем.
 */

import { App } from '@capacitor/app';

import type { BackHandler } from './back.js';

export async function listenBackButton(onBack: BackHandler): Promise<void> {
  await App.addListener('backButton', () => {
    if (onBack()) return;
    // Возвращаться некуда — уходим в фон. Данные остаются в базе, следующий
    // запуск поднимет приложение там же.
    void App.minimizeApp();
  });
}
