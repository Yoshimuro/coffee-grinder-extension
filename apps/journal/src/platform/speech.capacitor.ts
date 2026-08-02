/**
 * Голосовая заметка на телефоне — системный движок распознавания.
 *
 * Главное свойство этой реализации — умение сказать «нет». Офлайн-модель языка
 * в системе может быть не установлена, микрофонного разрешения может не быть,
 * на эмуляторе без Google-сервисов распознавателя нет вовсе (R-4). В любом из
 * этих случаев `available()` возвращает `false`, экран диагностики не рисует
 * кнопку «ГОЛОСОМ», и человек печатает — ровно та деградация, которую требует
 * README: молча, без баннеров и без объяснений.
 *
 * `available()` при этом ничего не спрашивает у человека: только наличие движка
 * и уже известное состояние разрешения (`checkPermissions` системного диалога
 * не показывает). Разрешение просится в `listen()` — то есть после нажатия
 * «ГОЛОСОМ». Так же поступают уведомления: спрашивать на входе в экран — просить
 * аванс ни за что (`notify.capacitor.ts`). Эмуляторный прогон BJ-7 поймал
 * обратное: диалог микрофона выскакивал при открытии оценки.
 *
 * `popup: false` и `partialResults: false`: системное окно поверх тёмного
 * экрана выглядит чужеродно, а частичные результаты интерфейсу не нужны — он
 * ждёт одну готовую реплику и дописывает её в заметку.
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';

import type { Lang } from '../db/schema.js';
import { type SpeechInput, localeOf } from './speech.js';

/** Больше одного варианта интерфейсу некуда деть — берётся первый. */
const MAX_RESULTS = 1;

export function createCapacitorSpeech(): SpeechInput {
  /**
   * Разрешение на микрофон. Спрашивается один раз — в момент нажатия
   * «ГОЛОСОМ», до старта записи: системный диалог поверх уже начатой записи был
   * бы худшим моментом из возможных.
   */
  const allowed = async (): Promise<boolean> => {
    const current = await SpeechRecognition.checkPermissions();
    if (current.speechRecognition === 'granted') return true;
    if (current.speechRecognition === 'denied') return false;
    const asked = await SpeechRecognition.requestPermissions();
    return asked.speechRecognition === 'granted';
  };

  return {
    async available(): Promise<boolean> {
      try {
        // Только определение возможностей: есть ли движок и не отказано ли уже.
        // Ни одного вызова, показывающего системный диалог.
        const { available } = await SpeechRecognition.available();
        if (!available) return false;

        const { speechRecognition } = await SpeechRecognition.checkPermissions();
        return speechRecognition !== 'denied';
      } catch {
        return false;
      }
    },

    async listen(lang: Lang = 'ru'): Promise<string | null> {
      try {
        if (!(await allowed())) return null;

        const { matches } = await SpeechRecognition.start({
          language: localeOf(lang),
          maxResults: MAX_RESULTS,
          popup: false,
          partialResults: false,
        });
        const heard = matches?.[0]?.trim();
        return heard ? heard : null;
      } catch {
        // Не расслышал, отменили, движок занят — для экрана это одно и то же.
        return null;
      } finally {
        // Идемпотентно: если распознавание уже остановилось само, плагин
        // просто ответит успехом.
        await SpeechRecognition.stop().catch(() => undefined);
      }
    },
  };
}
