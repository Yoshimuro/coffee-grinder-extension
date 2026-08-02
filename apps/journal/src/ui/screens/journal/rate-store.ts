/**
 * Состояние оценки — то, что человек набирает между «ОЦЕНИТЬ» и «СОХРАНИТЬ».
 *
 * Стор, а не состояние экрана, по одной причине: набор живёт на двух экранах.
 * Диагностика уводит в колесо вкусов (BJ-5), колесо докладывает выбранные
 * дескрипторы обратно, и по «НАЗАД» ни шкалы, ни заметка потеряться не должны.
 * Ровно так же это устроено в прототипе, где `diag`/`note`/`picked` лежат в
 * общем состоянии приложения (`DC:1033-1046`).
 *
 * **Контракт для BJ-5.** Колесу нужны только три вещи:
 *   - `picked` — что уже выбрано (`Descriptor[]`, то же, что ложится в запись);
 *   - `isPicked(id)` — подсветить уже выбранный сектор;
 *   - `togglePick(id)` — добавить или снять; интенсивность новому ставится 2
 *     (D-4), менять её умеет `setPickIntensity`.
 * Ни открывать, ни закрывать сессию оценки колесу не нужно: оно всегда
 * приходит из диагностики, которая её и завела.
 *
 * Запись в базу — {@link saveRating}: патч существующей записи либо создание
 * записи-дегустации. Дегустация до сохранения в базе не лежит (см. там же).
 */

import { create } from 'zustand';

import { type Screen, useNav } from '../../../app/nav.js';
import { isoDate, isoTime } from '../../../data/freshness.js';
import { DESC, nameOf } from '../../../data/wheel.js';
import { makeCupEntry, putEntry, updateEntry } from '../../../db/repo/entries.js';
import type { Descriptor, Diagnostics, Intensity, Lang } from '../../../db/schema.js';
import { START_INTENSITY, nextIntensity } from '../../components/Tag.js';
import { START_DIAG, type ScaleKey, setScale } from './diag-scales.js';

/* ── Чистые операции над списком выбранного ──────────────────────────────── */

/** Есть ли дескриптор в наборе. */
export function isPickedIn(list: readonly Descriptor[], id: string): boolean {
  return list.some(([d]) => d === id);
}

/** Добавить (с интенсивностью 2, D-4) или снять. */
export function togglePicked(list: readonly Descriptor[], id: string): Descriptor[] {
  if (isPickedIn(list, id)) return list.filter(([d]) => d !== id);
  return [...list, [id, START_INTENSITY]];
}

/** Поставить интенсивность конкретному дескриптору. */
export function setPickedIntensity(
  list: readonly Descriptor[],
  id: string,
  intensity: Intensity,
): Descriptor[] {
  return list.map(([d, i]): Descriptor => (d === id ? [d, intensity] : [d, i]));
}

/** Следующая интенсивность по кругу: 2 → 3 → 1 → 2 (D-4). */
export function cyclePicked(list: readonly Descriptor[], id: string): Descriptor[] {
  return list.map(([d, i]): Descriptor => (d === id ? [d, nextIntensity(i)] : [d, i]));
}

export function removePicked(list: readonly Descriptor[], id: string): Descriptor[] {
  return list.filter(([d]) => d !== id);
}

/**
 * Дескрипторы, найденные в распознанной реплике.
 *
 * Прототип подсовывал сюда фиксированную пару `['blueberry','honey']`
 * (`DC:1316`) — имитация. Здесь честный поиск названий в тексте: локальный,
 * без сети и без словаря синонимов. Найденное **предлагается** чипами, а не
 * проставляется само — это требование README:53, и оно важнее полноты поиска.
 */
export function suggestFromText(
  text: string,
  lang: Lang,
  picked: readonly Descriptor[] = [],
): string[] {
  const haystack = text.toLowerCase();
  const out: string[] = [];
  for (const id of Object.keys(DESC)) {
    if (isPickedIn(picked, id) || out.includes(id)) continue;
    if (haystack.includes(nameOf(id, lang).toLowerCase())) out.push(id);
  }
  return out;
}

/* ── Стор ────────────────────────────────────────────────────────────────── */

/**
 * Что оценивают. `entry` — уже сохранённое заваривание, `taste` — дегустация
 * «вне журнала», записи для которой ещё нет.
 */
export type RateTarget = { kind: 'entry'; id: string } | { kind: 'taste' };

export interface RateState {
  /** `null` — сессия оценки не заведена; экран диагностики заведёт её сам. */
  target: RateTarget | null;
  diag: Diagnostics;
  note: string;
  picked: Descriptor[];
  /** Предложенные, но ещё не принятые дескрипторы. */
  sug: string[];
  /** «Что за кофе» — только для дегустаций. */
  tasteName: string;

  /** Начать оценку сохранённого заваривания. Сбрасывает всё остальное. */
  startRating: (entryId: string) => void;
  /** Начать дегустацию «вне журнала». */
  startTasting: () => void;
  setScaleValue: (key: ScaleKey, value: number) => void;
  setNote: (note: string) => void;
  setTasteName: (name: string) => void;
  isPicked: (id: string) => boolean;
  togglePick: (id: string) => void;
  setPickIntensity: (id: string, intensity: Intensity) => void;
  removePick: (id: string) => void;
  suggest: (ids: string[]) => void;
  /** Принять предложенный дескриптор: он уходит из подсказок в выбранное. */
  acceptSuggestion: (id: string) => void;
  reset: () => void;
}

const EMPTY = {
  diag: { ...START_DIAG },
  note: '',
  picked: [] as Descriptor[],
  sug: [] as string[],
  tasteName: '',
};

export const useRate = create<RateState>((set, get) => ({
  target: null,
  ...EMPTY,

  startRating: (entryId) => set({ target: { kind: 'entry', id: entryId }, ...EMPTY }),
  startTasting: () => set({ target: { kind: 'taste' }, ...EMPTY }),

  setScaleValue: (key, value) => set((s) => ({ diag: setScale(s.diag, key, value) })),
  setNote: (note) => set({ note }),
  setTasteName: (tasteName) => set({ tasteName }),

  isPicked: (id) => isPickedIn(get().picked, id),
  togglePick: (id) => set((s) => ({ picked: togglePicked(s.picked, id) })),
  setPickIntensity: (id, intensity) =>
    set((s) => ({ picked: setPickedIntensity(s.picked, id, intensity) })),
  removePick: (id) => set((s) => ({ picked: removePicked(s.picked, id) })),

  suggest: (ids) => set({ sug: ids }),
  acceptSuggestion: (id) =>
    set((s) => ({ picked: togglePicked(s.picked, id), sug: s.sug.filter((x) => x !== id) })),

  reset: () => set({ target: null, ...EMPTY }),
}));

/**
 * Сессия жива, пока человек на диагностике или в колесе, — и заканчивается,
 * как только он ушёл.
 *
 * Без этого правила брошенная оценка прилипала бы к стору: экран «оценка
 * позже» и карточка на главном уводят на `diag` простым `go('diag')`, без
 * параметров, и подхват ждущей записи сработал бы только при пустой сессии.
 * То есть заваривание, записанное после брошенной дегустации, открыть на оценку
 * было бы уже нельзя.
 *
 * Подписка ставится один раз при загрузке модуля — стор оценки и без того
 * загружается ровно с этими двумя экранами.
 */
const RATING_SCREENS: readonly Screen[] = ['diag', 'wheel'];

useNav.subscribe((state, prev) => {
  if (state.screen === prev.screen) return;
  if (RATING_SCREENS.includes(state.screen)) return;
  if (useRate.getState().target === null) return;
  useRate.getState().reset();
});

/* ── Сохранение ──────────────────────────────────────────────────────────── */

/**
 * Записывает оценку и закрывает сессию (`saveDiag`, `DC:1034-1038`).
 *
 * Отличие от прототипа: запись-дегустация создаётся **здесь**, а не при входе
 * в диагностику. `openTaste` (`DC:972`) клал в журнал пустую `pending`-чашку
 * сразу, и брошенная оценка оставляла на главном экране карточку «оценка ждёт»
 * от заваривания, которого не было. Отложенное создание убирает этот мусор и
 * ничего не ломает: пока оценка не сохранена, показывать нечего.
 *
 * Возвращает id записи или `null`, если сессии не было.
 */
export async function saveRating(now: Date = new Date()): Promise<string | null> {
  const { target, diag, note, picked, tasteName } = useRate.getState();
  if (!target) return null;

  const patch = { diag: { ...diag }, note, desc: [...picked], status: 'done' as const };

  if (target.kind === 'entry') {
    const saved = await updateEntry(target.id, patch);
    useRate.getState().reset();
    return saved ? saved.id : null;
  }

  const cup = makeCupEntry({ date: isoDate(now), time: isoTime(now), diag });
  const title = tasteName.trim();
  await putEntry({ ...cup, ...patch, ...(title ? { title } : {}) });
  useRate.getState().reset();
  return cup.id;
}
