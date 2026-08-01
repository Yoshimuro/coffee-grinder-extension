/**
 * Движок таймера заваривания — порт `tPause`/`tAdv`/`makeEntry`/`logManual`
 * (component-report §4, `DC:1003-1032`).
 *
 * Логика вынесена в чистые функции над {@link TimerState}, а zustand-обёртка
 * {@link useTimer} только хранит текущее состояние: часы читаются из `Date.now()`
 * при каждом действии, а не тикают внутри стора, поэтому редьюсер тестируется
 * без таймеров и без фейковых часов.
 *
 * Правила прототипа, воспроизведённые дословно:
 * - пауза закрывает текущую стадию её **фактической** длительностью, `idx` не
 *   двигается, счётчик стадии обнуляется;
 * - выход из паузы дописывает отдельную стадию `pause` — это «стекание»;
 * - маркер нулевой длительности (`stir`, `valve`) не становится активным: он
 *   пишется в `rec` с нулём и индекс перескакивает через него — ровно один раз
 *   за нажатие;
 * - на последней стадии пауза недоступна (дренаж и есть стекание);
 * - `total` записи — фактический elapsed от старта, а не сумма стадий.
 */

import { create } from 'zustand';

import { isoDate, isoTime } from '../data/freshness.js';
import type {
  BeanRecord,
  Diagnostics,
  EntryRecord,
  Stage,
} from '../db/schema.js';
import { type BrewPlan, plannedTotal, stagesFor } from './stages.js';

/* ── Состояние ───────────────────────────────────────────────────────────── */

export interface TimerState {
  /** Плановые стадии, полученные из {@link stagesFor}. Не меняются по ходу. */
  readonly stages: readonly Stage[];
  /** Индекс активной стадии. */
  readonly idx: number;
  /** `Date.now()` старта заваривания. */
  readonly t0: number;
  /** `Date.now()` начала отсчёта текущей стадии (или паузы). */
  readonly s0: number;
  readonly run: boolean;
  /** Фактические стадии: та же форма `[key, sec, water]`. */
  readonly rec: readonly Stage[];
  readonly paused: boolean;
}

/** Секунды от старта заваривания. */
export function elapsed(t: TimerState, now: number): number {
  return (now - t.t0) / 1000;
}

/** Секунды от начала текущей стадии (в паузе — от её начала). */
export function stageElapsed(t: TimerState, now: number): number {
  return (now - t.s0) / 1000;
}

/** Активная плановая стадия, если индекс ещё в пределах массива. */
export function currentStage(t: TimerState): Stage | undefined {
  return t.stages[t.idx];
}

/** Пауза недоступна в паузе и на последней стадии (`DC:1004`). */
export function canPause(t: TimerState): boolean {
  return !t.paused && t.idx < t.stages.length - 1;
}

/* ── Переходы ────────────────────────────────────────────────────────────── */

export function startTimer(stages: readonly Stage[], now: number = Date.now()): TimerState {
  return { stages, idx: 0, t0: now, s0: now, run: true, rec: [], paused: false };
}

/**
 * Пауза. Возвращает то же состояние, если пауза сейчас недоступна, — вызывающей
 * стороне не нужно дублировать проверку.
 */
export function pauseTimer(t: TimerState, now: number = Date.now()): TimerState {
  if (!canPause(t)) return t;
  const cur = t.stages[t.idx];
  if (!cur) return t;
  const rec: Stage[] = [...t.rec, [cur[0], Math.round(stageElapsed(t, now)), cur[2]]];
  return { ...t, rec, paused: true, s0: now };
}

/** Заваривание закончилось: фактические стадии и фактическое общее время. */
export interface TimerFinish {
  rec: Stage[];
  /** Секунды от старта, округлённые. */
  total: number;
}

export type AdvanceResult =
  | { done: false; timer: TimerState }
  | ({ done: true } & TimerFinish);

/**
 * Главная кнопка. Закрывает текущую стадию (или паузу) и переходит к следующей;
 * на последней стадии вместо перехода отдаёт `done` с накопленным `rec`.
 */
export function advanceTimer(t: TimerState, now: number = Date.now()): AdvanceResult {
  const st = t.stages;
  const dur = Math.round(stageElapsed(t, now));

  if (t.paused) {
    const rec: Stage[] = [...t.rec, ['pause', dur, 0]];
    const idx = swallowMarker(st, t.idx + 1, rec);
    return { done: false, timer: { ...t, rec, paused: false, idx, s0: now } };
  }

  const cur = st[t.idx];
  if (!cur) return { done: false, timer: t };

  const rec: Stage[] = [...t.rec, [cur[0], dur, cur[2]]];
  if (t.idx >= st.length - 1) return { done: true, rec, total: Math.round(elapsed(t, now)) };

  const idx = swallowMarker(st, t.idx + 1, rec);
  return { done: false, timer: { ...t, rec, idx, s0: now } };
}

/**
 * Проглатывание маркера: стадия с нулевой целевой длительностью пишется в `rec`
 * и пропускается. Проверка одноразовая, как в прототипе, — два маркера подряд
 * в генераторе стадий не встречаются. Последняя стадия не проглатывается
 * никогда, иначе заваривание завершилось бы само собой.
 */
function swallowMarker(stages: readonly Stage[], idx: number, rec: Stage[]): number {
  const nxt = stages[idx];
  if (nxt && nxt[1] === 0 && idx < stages.length - 1) {
    rec.push([nxt[0], 0, 0]);
    return idx + 1;
  }
  return idx;
}

/* ── Запись в журнал ─────────────────────────────────────────────────────── */

/** Сетап заваривания целиком: план стадий плюс поля, нужные только записи. */
export interface BrewSetup extends BrewPlan {
  /** Настройка своей кофемолки. Для молотого и дрипа в запись идёт `null`. */
  grind: number | null;
  temp: number;
}

/** Диагностика записи, которая ещё ждёт оценки. Схема требует поле всегда. */
export const PENDING_DIAG: Readonly<Diagnostics> = Object.freeze({
  acid: 0,
  bitter: 0,
  body: 0,
  balance: 0,
});

export interface MakeEntryInput {
  setup: BrewSetup;
  /** Пачка — источник формы, дозы дрипа и остатка. */
  bean: BeanRecord;
  /** Фактические стадии таймера или плановые при записи без таймера. */
  stages: Stage[];
  /** Секунды. */
  total: number;
  now: Date;
  /** Только для тестов и импорта; по умолчанию `j<timestamp>`, как в прототипе. */
  id?: string;
}

export interface MakeEntryResult {
  entry: EntryRecord;
  /** Пачка со списанным остатком. Тот же объект, если списывать нечего. */
  bean: BeanRecord;
}

/**
 * Собирает запись журнала и списывает остаток пачки (`DC:1021-1030`). Чистая:
 * ничего не пишет в базу — это делает вызывающий экран (BJ-4).
 *
 * Отличия от прототипа, продиктованные Dexie-схемой v1: `devName` без девайса —
 * пустая строка, а не `undefined`; `diag`/`desc`/`note` заполняются пустыми
 * значениями, потому что поля обязательные. Остаток трогаем, только если он
 * вообще задан, иначе `undefined - dose` дал бы `NaN`.
 */
export function makeEntry(input: MakeEntryInput): MakeEntryResult {
  const { setup, bean, stages, total, now } = input;
  const dev = bean.form === 'drip' ? null : setup.device;
  const dose = bean.form === 'drip' ? (bean.dose ?? 0) : setup.dose;

  const entry: EntryRecord = {
    id: input.id ?? `j${now.getTime()}`,
    date: isoDate(now),
    time: isoTime(now),
    bean: bean.id,
    device: dev ? dev.id : null,
    devName: dev ? dev.name : '',
    mode: bean.form === 'drip' ? 'drip' : dev ? dev.flow : 'perc',
    grind: bean.form === 'beans' ? setup.grind : null,
    dose,
    water: setup.water,
    temp: setup.temp,
    total,
    stages,
    status: 'pending',
    diag: { ...PENDING_DIAG },
    desc: [],
    note: '',
  };

  if (bean.form === 'drip' || entry.mode === 'perc') entry.pours = setup.pours;
  if (dev && dev.flow === 'hybrid' && setup.hyMode === 'mid') entry.valveAt = setup.valveAt;

  return { entry, bean: decrement(bean, dose) };
}

/** Списание: дрип теряет пакетик, зерно и молотый — дозу. Зажато нулём. */
function decrement(bean: BeanRecord, dose: number): BeanRecord {
  if (bean.form === 'drip') {
    if (bean.leftCount === undefined) return bean;
    return { ...bean, leftCount: Math.max(0, bean.leftCount - 1) };
  }
  if (bean.left === undefined) return bean;
  return { ...bean, left: Math.max(0, bean.left - dose) };
}

/**
 * «ЗАПИСАТЬ БЕЗ ТАЙМЕРА» (`DC:1032`): та же запись, но из плановых стадий и
 * суммы плановых длительностей.
 */
export function logManual(
  input: Omit<MakeEntryInput, 'stages' | 'total'>,
): MakeEntryResult {
  const stages = stagesFor(input.setup);
  return makeEntry({ ...input, stages, total: plannedTotal(stages) });
}

/* ── Стор ────────────────────────────────────────────────────────────────── */

export interface TimerStore {
  timer: TimerState | null;
  /** Старт с плановых стадий. */
  start: (stages: readonly Stage[], now?: number) => void;
  /** Пауза; молча ничего не делает, когда недоступна. */
  pause: (now?: number) => void;
  /**
   * Главная кнопка. Возвращает фактические стадии и общее время, когда
   * заваривание завершилось (и обнуляет таймер), иначе `null`.
   */
  advance: (now?: number) => TimerFinish | null;
  /** Отмена без записи. */
  cancel: () => void;
}

export const useTimer = create<TimerStore>((set, get) => ({
  timer: null,

  start: (stages, now = Date.now()) => set({ timer: startTimer(stages, now) }),

  pause: (now = Date.now()) => {
    const t = get().timer;
    if (!t) return;
    set({ timer: pauseTimer(t, now) });
  },

  advance: (now = Date.now()) => {
    const t = get().timer;
    if (!t) return null;
    const next = advanceTimer(t, now);
    if (next.done) {
      set({ timer: null });
      return { rec: next.rec, total: next.total };
    }
    set({ timer: next.timer });
    return null;
  },

  cancel: () => set({ timer: null }),
}));
