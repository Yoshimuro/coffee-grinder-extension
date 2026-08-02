/**
 * «Оценка ждёт» — единственное уведомление, которое приложение себе позволяет.
 *
 * Оно существует, потому что кофе раскрывается на остывании: экран «ОЦЕНКА
 * ПОЗЖЕ» прямо предлагает вернуться позже, и без напоминания это предложение
 * означало бы «забудь». Через {@link RATING_DELAY_MIN} минут (D-4) приходит
 * ровно одно уведомление; тап открывает приложение, а карточка ждущей оценки и
 * так стоит на домашнем экране — отдельной навигации по тапу не нужно.
 *
 * Никакой геймификации, серий и «ты не заваривал три дня»: одно уведомление про
 * одно конкретное действие, и то, которое человек сам отложил.
 *
 * В браузере уведомления не ставятся вовсе. Web Notifications требуют
 * разрешения, а разрешение — это диалог, который приложение обещало не
 * показывать без нужды; вкладка, к тому же, обычно закрыта к этому моменту.
 */

import { bind } from './native.js';

/** Через сколько минут после «ПОЗЖЕ» напомнить (D-4). */
export const RATING_DELAY_MIN = 15;

/**
 * Идентификатор уведомления. Он один и тот же всегда: ждущая оценки запись в
 * каждый момент времени одна (`findPendingEntry`), и новое заваривание должно
 * перебивать прошлое напоминание, а не выстраиваться в очередь за ним.
 */
export const RATING_NOTIFICATION_ID = 1;

export interface RatingReminder {
  /** Заголовок и текст — из таблицы строк, платформенный слой их не сочиняет. */
  title: string;
  body: string;
  /** Когда показать. */
  at: Date;
}

export interface Notifier {
  /** Ставит (или переставляет) напоминание об оценке. */
  schedule(reminder: RatingReminder): Promise<void>;
  /** Снимает его — оценили раньше, чем оно пришло. */
  cancel(): Promise<void>;
}

/** Момент напоминания: {@link RATING_DELAY_MIN} минут от «ПОЗЖЕ». */
export function ratingDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + RATING_DELAY_MIN * 60_000);
}

/** Веб-реализация: уведомлений нет, и это не ошибка. */
export function createWebNotify(): Notifier {
  return {
    schedule: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
  };
}

/* ── Реализация, которую видят экраны ────────────────────────────────────── */

const notifier = bind<Notifier>(createWebNotify, async () =>
  (await import('./notify.capacitor.js')).createCapacitorNotify(),
);

export const notify: Notifier = {
  schedule: async (reminder) => {
    await (await notifier()).schedule(reminder);
  },
  cancel: async () => {
    await (await notifier()).cancel();
  },
};
