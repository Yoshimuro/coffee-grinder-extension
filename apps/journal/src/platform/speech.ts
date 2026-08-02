/**
 * Голосовой ввод заметки — платформенный интерфейс и веб-заглушка.
 *
 * В вебе `available()` возвращает `false` и делает это молча. Никаких баннеров
 * «установите приложение» и никаких кнопок, которые ничего не делают: экран
 * диагностики просто не рисует «ГОЛОСОМ», и остаётся клавиатура — это и есть
 * деградация, которую требует README (component-report §10.2).
 *
 * Web Speech API здесь намеренно не используется, хотя в Chrome он есть: он
 * отправляет звук на сервера Google, а приложение обещает «локально · офлайн ·
 * без аккаунта». Настоящее распознавание живёт на телефоне
 * (`speech.capacitor.ts`, системный движок), и там же оно молча отвечает
 * «недоступно», если офлайн-модели в системе нет.
 */

import type { Lang } from '../db/schema.js';
import { bind } from './native.js';

export interface SpeechInput {
  /** Есть ли распознавание. Спрашивать до каждого показа кнопки. */
  available(): Promise<boolean>;
  /**
   * Слушает одну реплику. `null` — не расслышал или отменили.
   *
   * `lang` — язык интерфейса: движок распознаёт заметно хуже, если ему не
   * сказать, на каком языке говорят. Реализация без распознавания его
   * игнорирует.
   */
  listen(lang?: Lang): Promise<string | null>;
}

/** Веб-реализация: распознавания нет. */
export function createWebSpeech(): SpeechInput {
  return {
    available: () => Promise.resolve(false),
    listen: () => Promise.resolve(null),
  };
}

/** Код локали для системного движка. */
export function localeOf(lang: Lang): string {
  return lang === 'ru' ? 'ru-RU' : 'en-US';
}

/* ── Реализация, которую видят экраны ────────────────────────────────────── */

const input = bind<SpeechInput>(createWebSpeech, async () =>
  (await import('./speech.capacitor.js')).createCapacitorSpeech(),
);

export const speech: SpeechInput = {
  available: async () => (await input()).available(),
  listen: async (lang) => (await input()).listen(lang),
};
