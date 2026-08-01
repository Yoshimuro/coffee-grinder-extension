import { beforeEach, describe, expect, it } from 'vitest';

import type { BeanRecord, DeviceRecord, Stage } from '../../src/db/schema.js';
import { type BrewPlan, plannedTotal, stagesFor } from '../../src/domain/stages.js';
import {
  type BrewSetup,
  type TimerState,
  advanceTimer,
  canPause,
  currentStage,
  elapsed,
  logManual,
  makeEntry,
  pauseTimer,
  stageElapsed,
  startTimer,
  useTimer,
} from '../../src/domain/timer.js';

/* ── Фикстуры ────────────────────────────────────────────────────────────── */

const T0 = 1_800_000_000_000;
const at = (sec: number): number => T0 + sec * 1000;

const v60: DeviceRecord = {
  id: 'v60',
  name: 'Hario V60-02',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};
const aero: DeviceRecord = { ...v60, id: 'aero', name: 'AeroPress', flow: 'imm', bottom: 'cyl' };
const hario: DeviceRecord = { ...v60, id: 'switch', name: 'Hario Switch', flow: 'hybrid' };

const beans: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};
const dripBag: BeanRecord = {
  id: 'drip1',
  form: 'drip',
  name: 'Дрип · Колумбия Уила',
  roast: '2026-07-10',
  photos: [],
  count: 5,
  leftCount: 3,
  dose: 12,
};
const ground: BeanRecord = {
  id: 'kenya',
  form: 'ground',
  name: 'Кения Ньери',
  roast: '2026-07-18',
  photos: [],
  weight: 100,
  left: 64,
};

const plan: BrewPlan = {
  form: 'beans',
  device: v60,
  hyMode: 'perc',
  dose: 15,
  water: 250,
  pours: 2,
  valveAt: 80,
};
const setup: BrewSetup = { ...plan, grind: 4.6, temp: 94 };
const NOW = new Date(2026, 7, 1, 9, 12);

/* ── Редьюсер ────────────────────────────────────────────────────────────── */

describe('таймер — старт и часы', () => {
  it('стартует с первой стадии с пустой записью', () => {
    const t = startTimer(stagesFor(plan), T0);
    expect(t).toMatchObject({ idx: 0, run: true, paused: false, rec: [] });
    expect(currentStage(t)).toEqual(['bloom', 45, 45]);
    expect(elapsed(t, at(30))).toBe(30);
    expect(stageElapsed(t, at(30))).toBe(30);
  });
});

describe('таймер — перколяция с паузой посреди пролива', () => {
  const stages = stagesFor(plan);

  it('пишет фактические длительности, «стекание» отдельной стадией pause', () => {
    let t = startTimer(stages, T0);

    const afterBloom = advanceTimer(t, at(46));
    expect(afterBloom.done).toBe(false);
    if (afterBloom.done) return;
    t = afterBloom.timer;
    expect(t.idx).toBe(1);
    expect(t.rec).toEqual([['bloom', 46, 45]]);

    // Пауза закрывает пролив фактической длительностью и не двигает индекс.
    t = pauseTimer(t, at(66));
    expect(t.paused).toBe(true);
    expect(t.idx).toBe(1);
    expect(t.rec).toEqual([
      ['bloom', 46, 45],
      ['pour', 20, 105],
    ]);
    expect(canPause(t)).toBe(false);

    // Выход из паузы дописывает саму паузу и переходит к следующей стадии.
    const afterPause = advanceTimer(t, at(81));
    expect(afterPause.done).toBe(false);
    if (afterPause.done) return;
    t = afterPause.timer;
    expect(t.paused).toBe(false);
    expect(t.idx).toBe(2);
    expect(t.rec[2]).toEqual(['pause', 15, 0]);

    const afterSecondPour = advanceTimer(t, at(119));
    expect(afterSecondPour.done).toBe(false);
    if (afterSecondPour.done) return;
    t = afterSecondPour.timer;
    expect(t.idx).toBe(3);

    // На последней стадии пауза недоступна — дренаж и есть стекание.
    expect(canPause(t)).toBe(false);
    expect(pauseTimer(t, at(130))).toBe(t);

    const finish = advanceTimer(t, at(169));
    expect(finish.done).toBe(true);
    if (!finish.done) return;
    expect(finish.total).toBe(169);
    expect(finish.rec).toEqual([
      ['bloom', 46, 45],
      ['pour', 20, 105],
      ['pause', 15, 0],
      ['pour', 38, 100],
      ['drain', 50, 0],
    ]);
  });

  it('пауза в паузе ничего не меняет', () => {
    const t = pauseTimer(startTimer(stages, T0), at(10));
    expect(pauseTimer(t, at(20))).toBe(t);
  });

  it('не мутирует предыдущее состояние', () => {
    const t = startTimer(stages, T0);
    const next = advanceTimer(t, at(46));
    expect(t.rec).toEqual([]);
    expect(t.idx).toBe(0);
    expect(next.done).toBe(false);
  });
});

describe('таймер — маркеры нулевой длительности', () => {
  it('иммерсия: stir проглатывается и попадает в запись нулём', () => {
    const stages = stagesFor({ ...plan, form: 'ground', water: 210, device: aero });
    expect(stages).toEqual([
      ['steep', 120, 210],
      ['stir', 0, 0],
      ['press', 30, 0],
    ]);

    let t = startTimer(stages, T0);
    const afterSteep = advanceTimer(t, at(118));
    expect(afterSteep.done).toBe(false);
    if (afterSteep.done) return;
    t = afterSteep.timer;
    // Маркер не становится активной стадией — индекс перепрыгнул на press.
    expect(t.idx).toBe(2);
    expect(t.rec).toEqual([
      ['steep', 118, 210],
      ['stir', 0, 0],
    ]);

    const finish = advanceTimer(t, at(147));
    expect(finish.done).toBe(true);
    if (!finish.done) return;
    expect(finish.rec).toEqual([
      ['steep', 118, 210],
      ['stir', 0, 0],
      ['press', 29, 0],
    ]);
    expect(finish.total).toBe(147);
  });

  it('гибрид mid: valve проглатывается, дренаж остаётся последним', () => {
    const stages = stagesFor({ ...plan, water: 240, valveAt: 80, device: hario, hyMode: 'mid' });
    let t = startTimer(stages, T0);
    const afterSteep = advanceTimer(t, at(84));
    expect(afterSteep.done).toBe(false);
    if (afterSteep.done) return;
    t = afterSteep.timer;
    expect(t.idx).toBe(2);
    expect(t.rec).toEqual([
      ['steep', 84, 240],
      ['valve', 0, 0],
    ]);
    expect(canPause(t)).toBe(false);
  });

  it('маркер проглатывается и на выходе из паузы', () => {
    const stages: Stage[] = [
      ['steep', 150, 240],
      ['valve', 0, 0],
      ['drain', 60, 0],
    ];
    let t = startTimer(stages, T0);
    t = pauseTimer(t, at(100));
    expect(t.rec).toEqual([['steep', 100, 240]]);

    const out = advanceTimer(t, at(130));
    expect(out.done).toBe(false);
    if (out.done) return;
    expect(out.timer.idx).toBe(2);
    expect(out.timer.rec).toEqual([
      ['steep', 100, 240],
      ['pause', 30, 0],
      ['valve', 0, 0],
    ]);
  });

  it('одностадийный план завершается первым же нажатием', () => {
    const t: TimerState = startTimer([['pour', 30, 100]], T0);
    expect(canPause(t)).toBe(false);
    const finish = advanceTimer(t, at(31));
    expect(finish.done).toBe(true);
    if (!finish.done) return;
    expect(finish.rec).toEqual([['pour', 31, 100]]);
  });
});

/* ── Запись в журнал ─────────────────────────────────────────────────────── */

describe('makeEntry', () => {
  const rec: Stage[] = [
    ['bloom', 46, 45],
    ['pour', 20, 105],
    ['pause', 15, 0],
    ['pour', 38, 100],
    ['drain', 50, 0],
  ];

  it('собирает запись перколяции и списывает дозу с пачки', () => {
    const { entry, bean } = makeEntry({ setup, bean: beans, stages: rec, total: 169, now: NOW });
    expect(entry).toMatchObject({
      id: `j${NOW.getTime()}`,
      date: '2026-08-01',
      time: '09:12',
      bean: 'java',
      device: 'v60',
      devName: 'Hario V60-02',
      mode: 'perc',
      grind: 4.6,
      dose: 15,
      water: 250,
      temp: 94,
      total: 169,
      status: 'pending',
      pours: 2,
    });
    expect(entry.stages).toBe(rec);
    expect(entry.valveAt).toBeUndefined();
    expect(entry.diag).toEqual({ acid: 0, bitter: 0, body: 0, balance: 0 });
    expect(entry.desc).toEqual([]);
    expect(entry.note).toBe('');
    expect(bean.left).toBe(187 - 15);
    expect(beans.left).toBe(187);
  });

  it('дрип-пакет: доза от производителя, штучное списание, помол не пишется', () => {
    const { entry, bean } = makeEntry({
      setup: { ...setup, form: 'drip', device: v60 },
      bean: dripBag,
      stages: [],
      total: 150,
      now: NOW,
    });
    expect(entry).toMatchObject({ mode: 'drip', dose: 12, grind: null, device: null, devName: '', pours: 2 });
    expect(bean.leftCount).toBe(2);
    expect(bean.left).toBeUndefined();
  });

  it('молотый кофе: помол в записи null, списывается доза', () => {
    const { entry, bean } = makeEntry({
      setup: { ...setup, form: 'ground', device: aero, dose: 14, water: 210 },
      bean: ground,
      stages: [],
      total: 120,
      now: NOW,
    });
    expect(entry.grind).toBeNull();
    expect(entry.mode).toBe('imm');
    expect(entry.pours).toBeUndefined();
    expect(bean.left).toBe(64 - 14);
  });

  it('гибрид в режиме mid пишет момент открытия клапана, в режиме perc — нет', () => {
    const mid = makeEntry({
      setup: { ...setup, device: hario, hyMode: 'mid', valveAt: 80 },
      bean: beans,
      stages: [],
      total: 170,
      now: NOW,
    }).entry;
    expect(mid).toMatchObject({ mode: 'hybrid', valveAt: 80 });
    expect(mid.pours).toBeUndefined();

    const perc = makeEntry({
      setup: { ...setup, device: hario, hyMode: 'perc' },
      bean: beans,
      stages: [],
      total: 170,
      now: NOW,
    }).entry;
    expect(perc.valveAt).toBeUndefined();
  });

  it('без девайса запись всё равно перколяция', () => {
    const { entry } = makeEntry({
      setup: { ...setup, device: null },
      bean: beans,
      stages: [],
      total: 100,
      now: NOW,
    });
    expect(entry).toMatchObject({ mode: 'perc', device: null, devName: '', pours: 2 });
  });

  it('остаток зажат нулём', () => {
    const almostEmpty: BeanRecord = { ...beans, left: 5 };
    expect(makeEntry({ setup, bean: almostEmpty, stages: [], total: 10, now: NOW }).bean.left).toBe(0);
    const lastBag: BeanRecord = { ...dripBag, leftCount: 0 };
    expect(
      makeEntry({ setup: { ...setup, form: 'drip' }, bean: lastBag, stages: [], total: 10, now: NOW }).bean
        .leftCount,
    ).toBe(0);
  });

  it('пачку без учёта остатка не трогает', () => {
    const untracked: BeanRecord = { id: 'x', form: 'beans', roast: '2026-07-01', photos: [] };
    const { bean } = makeEntry({ setup, bean: untracked, stages: [], total: 10, now: NOW });
    expect(bean).toBe(untracked);
  });
});

describe('logManual', () => {
  it('пишет плановые стадии и сумму плановых длительностей', () => {
    const { entry } = logManual({ setup, bean: beans, now: NOW });
    const planned = stagesFor(setup);
    expect(entry.stages).toEqual(planned);
    expect(entry.total).toBe(plannedTotal(planned));
    expect(entry.total).toBe(175);
    expect(entry.status).toBe('pending');
  });
});

/* ── Стор ────────────────────────────────────────────────────────────────── */

describe('useTimer — zustand-обёртка', () => {
  beforeEach(() => useTimer.setState({ timer: null }));

  it('проводит заваривание от старта до записи', () => {
    const stages = stagesFor({ ...plan, water: 210, device: aero, form: 'ground' });
    const { start, pause, advance } = useTimer.getState();

    start(stages, T0);
    expect(useTimer.getState().timer?.idx).toBe(0);

    // Пауза посреди настаивания.
    pause(at(60));
    expect(useTimer.getState().timer?.paused).toBe(true);

    expect(advance(at(90))).toBeNull();
    expect(useTimer.getState().timer?.idx).toBe(2);

    const finish = advance(at(120));
    expect(finish).toEqual({
      rec: [
        ['steep', 60, 210],
        ['pause', 30, 0],
        ['stir', 0, 0],
        ['press', 30, 0],
      ],
      total: 120,
    });
    expect(useTimer.getState().timer).toBeNull();
  });

  it('действия без активного таймера безопасны', () => {
    const { pause, advance, cancel } = useTimer.getState();
    pause();
    cancel();
    expect(advance()).toBeNull();
    expect(useTimer.getState().timer).toBeNull();
  });

  it('cancel бросает заваривание без записи', () => {
    const { start, cancel } = useTimer.getState();
    start(stagesFor(plan), T0);
    cancel();
    expect(useTimer.getState().timer).toBeNull();
  });
});
