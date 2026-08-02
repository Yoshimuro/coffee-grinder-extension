/**
 * Что именно показывают деталь и сравнение.
 *
 * Навигация (`app/nav.ts`) параметров не носит: `go('detail')` знает экран, но
 * не запись. В прототипе аргументы летели вторым параметром `go(screen, patch)`
 * прямо в общее состояние (`DC:1147`, `DC:1329`, `DC:1334`); здесь тот же приём,
 * но адресно — маленький стор рядом с экранами, которые его читают, вместо
 * расширения замороженного контракта навигации.
 *
 * Хранятся id, а не записи: пока человек стоит на детали, запись может
 * измениться (оценка, удаление), и экран обязан увидеть свежую версию из базы.
 *
 * Повтора заваривания здесь нет намеренно: сетап умеет собираться из записи сам
 * (`brewing/brew-store.ts`, `fromEntry`), и деталь зовёт его напрямую. Второй
 * формат тех же параметров был бы лишним слоем перевода.
 */

import { create } from 'zustand';

import type { EntryRecord } from '../../../db/schema.js';

export interface ViewState {
  /** Запись, открытая на детали. */
  viewId: string | null;
  /** Пара для сравнения: A новее B (`openCompare`, `DC:1329`). */
  pair: readonly [string, string] | null;

  openEntry: (id: string) => void;
  openPair: (pair: readonly [string, string]) => void;
}

export const useJournalView = create<ViewState>((set) => ({
  viewId: null,
  pair: null,

  openEntry: (viewId) => set({ viewId }),
  openPair: (pair) => set({ pair }),
}));

/**
 * Пара для сравнения в порядке §9: новая запись становится A.
 * Сортировка та же, что у ленты журнала, — по дате, затем по времени.
 */
export function orderPair(a: EntryRecord, b: EntryRecord): readonly [string, string] {
  const newer = a.date > b.date || (a.date === b.date && a.time >= b.time);
  return newer ? [a.id, b.id] : [b.id, a.id];
}
