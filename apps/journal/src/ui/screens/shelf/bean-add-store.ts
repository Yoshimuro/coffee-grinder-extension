/**
 * Черновик новой пачки.
 *
 * В стор, а не в состояние экрана, по двум причинам: съёмка уводит в системный
 * пикер файлов и обратно (в BJ-6 — в камеру, где WebView могут выгрузить), а
 * входов на экран два — «ДОБАВИТЬ КОФЕ» с полки и «+ ЗЕРНО» с сетапа
 * заваривания. Первый начинает с чистого листа через `start`, второй, как и
 * раньше, идёт мимо: на пустой полке чистить нечего.
 *
 * В базу не пишется: это черновик, а не запись. Пачка появляется на полке одним
 * `putBean` по «СОХРАНИТЬ» — брошенное добавление не оставляет следа.
 */

import { create } from 'zustand';

import type { BeanForm, PhotoRef } from '../../../db/schema.js';

export interface BeanAddState {
  form: BeanForm;
  /** ISO `YYYY-MM-DD`. Экран показывает и принимает `DD.MM.YYYY`. */
  roast: string;
  /** Граммы у зерна и молотого, штуки у дрипа. */
  amount: number;
  name: string;
  photos: PhotoRef[];

  /** Новый черновик — с полки, по «ДОБАВИТЬ КОФЕ». */
  start: () => void;
  setForm: (form: BeanForm) => void;
  setRoast: (roast: string) => void;
  setAmount: (amount: number) => void;
  setName: (name: string) => void;
  addPhoto: (photo: PhotoRef) => void;
}

/**
 * Пустой черновик. Вес 250 г и 10 пакетов — ходовая фасовка и она же стоит в
 * прототипе (`DC:918`); дата обжарки не подставляется вовсе, потому что
 * выдуманная дата тихо испортила бы всю свежесть на полке.
 */
export const EMPTY_DRAFT = Object.freeze({
  form: 'beans' as BeanForm,
  roast: '',
  amount: 250,
  name: '',
});

/** Количество по умолчанию при смене формы: граммы к граммам, штуки к штукам. */
export function defaultAmount(form: BeanForm): number {
  return form === 'drip' ? 10 : 250;
}

export const useBeanAdd = create<BeanAddState>((set) => ({
  ...EMPTY_DRAFT,
  photos: [],

  start: () => set({ ...EMPTY_DRAFT, photos: [] }),

  // Смена формы уносит и количество: 250 штук дрипа — не то, что имел в виду
  // человек, переключивший «ЗЕРНО» на «ДРИП-ПАКЕТ».
  setForm: (form) => set({ form, amount: defaultAmount(form) }),
  setRoast: (roast) => set({ roast }),
  setAmount: (amount) => set({ amount }),
  setName: (name) => set({ name }),
  addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
}));
