/**
 * Напоминание об оценке на телефоне — `LocalNotifications`.
 *
 * Разрешение спрашивается в момент, когда человек нажал «ПОЗЖЕ», то есть сам
 * попросил вернуть его к этой чашке. Спрашивать на первом запуске — просить
 * аванс ни за что; Android 13+ всё равно требует явного согласия.
 *
 * Отказ в разрешении глотается: без уведомления карточка «ОЦЕНКА ЖДЁТ» всё
 * равно стоит на домашнем экране, и приложение не потеряло ничего, кроме
 * напоминания.
 */

import { LocalNotifications } from '@capacitor/local-notifications';

import { RATING_NOTIFICATION_ID, type Notifier, type RatingReminder } from './notify.js';

export function createCapacitorNotify(): Notifier {
  const allowed = async (): Promise<boolean> => {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === 'granted';
  };

  return {
    async schedule(reminder: RatingReminder): Promise<void> {
      try {
        if (!(await allowed())) return;
        // Переставляем, а не добавляем: id один, и планировщик заменяет
        // уведомление с тем же идентификатором.
        await LocalNotifications.schedule({
          notifications: [
            {
              id: RATING_NOTIFICATION_ID,
              title: reminder.title,
              body: reminder.body,
              schedule: { at: reminder.at, allowWhileIdle: true },
            },
          ],
        });
      } catch {
        /* не поставилось — карточка на главном экране остаётся */
      }
    },

    async cancel(): Promise<void> {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: RATING_NOTIFICATION_ID }],
        });
      } catch {
        /* нечего снимать */
      }
    },
  };
}
