/**
 * Какая пачка открыта на карточке.
 *
 * Та же задача и то же решение, что у `journal/view-store.ts`: навигация
 * параметров не носит, а прототип передавал `beanId` вторым аргументом
 * `go('bean', { beanId })` (`DC:1253`). Хранится id, а не запись, — пока
 * карточка открыта, пачку могли списать заварками, и экран обязан видеть
 * свежую версию из базы.
 */

import { create } from 'zustand';

export interface BeanViewState {
  /** Пачка, открытая на карточке. */
  beanId: string | null;
  openBean: (id: string) => void;
}

export const useBeanView = create<BeanViewState>((set) => ({
  beanId: null,
  openBean: (beanId) => set({ beanId }),
}));
