/**
 * Плановые стадии заваривания — порт `stagesFor` (component-report §3,
 * `DC:994-1002`).
 *
 * Пять веток: `drip` (по форме пачки) и четыре по потоку девайса — `perc`,
 * `imm`, `hy-imm`, `hy-mid`. Гибрид разворачивается в `hy-<hyMode>`, причём
 * `hy-perc` идёт по перколяционной ветке.
 *
 * D-2 — единственное осознанное отклонение: в drip-ветке последний пролив
 * добирает остаток воды, как это делает перколяция. В прототипе вода на пролив
 * округлялась до 5 г без компенсации, и сумма стадий расходилась с заданной
 * (`water = 200`, `pours = 3` давали 195 г).
 */

import type { BeanForm, DeviceRecord, Stage, StageKey } from '../db/schema.js';

/** Режим гибрида: клапан закрыт (пролив), открыт (иммерсия) или открывается по времени. */
export type HybridMode = 'perc' | 'imm' | 'mid';

/** Вход генератора — сетап заваривания с уже разрешёнными пачкой и девайсом. */
export interface BrewPlan {
  /** Форма кофе: `drip` уводит в свою ветку раньше, чем смотрят на девайс. */
  form: BeanForm;
  /** Свой девайс или `null` — тогда работает фолбэк прототипа `perc`/`cone`. */
  device: DeviceRecord | null;
  hyMode: HybridMode;
  /** Граммы. Смачивание считается от дозы. */
  dose: number;
  /** Граммы. Сумма воды по стадиям всегда равна этому числу. */
  water: number;
  /** 1…6, влияет только на `drip` и `perc`. */
  pours: number;
  /** Секунда открытия клапана — целевая длительность настаивания в `hy-mid`. */
  valveAt: number;
}

/** Девайс не выбран — заваривание считается перколяцией в конусе (`DC:997`). */
const FALLBACK: Pick<DeviceRecord, 'flow' | 'bottom'> = { flow: 'perc', bottom: 'cone' };

/** Округление воды до 5 г — шаг, которым реально льют из чайника. */
const round5 = (g: number): number => Math.round(g / 5) * 5;

export function stagesFor(b: BrewPlan): Stage[] {
  if (b.form === 'drip') return dripStages(b);

  const dev = b.device ?? FALLBACK;
  const mode = dev.flow === 'hybrid' ? `hy-${b.hyMode}` : dev.flow;

  if (mode === 'perc' || mode === 'hy-perc') return percStages(b);
  if (mode === 'imm')
    return [
      ['steep', 120, b.water],
      ['stir', 0, 0],
      [dev.bottom === 'cyl' ? 'press' : 'drain', 30, 0],
    ];
  if (mode === 'hy-imm')
    return [
      ['steep', 150, b.water],
      ['valve', 0, 0],
      ['drain', 60, 0],
    ];
  return [
    ['steep', b.valveAt, b.water],
    ['valve', 0, 0],
    ['drain', 90, 0],
  ];
}

/** Дрип-пакет: N проливов, N−1 настаиваний между ними, финальный дренаж. */
function dripStages(b: BrewPlan): Stage[] {
  const n = Math.max(1, b.pours);
  const per = round5(b.water / n);
  const st: Stage[] = [];
  for (let i = 0; i < n; i++) {
    // D-2: остаток уходит в последний пролив, поэтому сумма сходится с `water`.
    st.push(['pour', 30, i === n - 1 ? b.water - per * (n - 1) : per]);
    if (i < n - 1) st.push(['steep', 30, 0]);
  }
  st.push(['drain', 30, 0]);
  return st;
}

/** Перколяция: смачивание 3× дозы, затем N проливов и дренаж. */
function percStages(b: BrewPlan): Stage[] {
  const n = Math.max(1, b.pours);
  const bl = round5(b.dose * 3);
  const rest = b.water - bl;
  const per = round5(rest / n);
  const st: Stage[] = [['bloom', 45, bl]];
  for (let i = 0; i < n; i++) st.push(['pour', 40, i === n - 1 ? rest - per * (n - 1) : per]);
  st.push(['drain', 50, 0]);
  return st;
}

/** Плановая длительность — сумма целевых секунд. Маркеры дают ноль. */
export function plannedTotal(stages: readonly Stage[]): number {
  return stages.reduce((s, x) => s + x[1], 0);
}

/** Плановая вода — сумма по стадиям. Всегда равна `plan.water`. */
export function plannedWater(stages: readonly Stage[]): number {
  return stages.reduce((s, x) => s + x[2], 0);
}

/** Маркер — стадия нулевой длительности (`stir`, `valve`): её таймер проглатывает. */
export function isMarker(stage: Stage): boolean {
  return stage[1] === 0;
}

/** Полный набор ключей стадий. `pause` порождает только таймер. */
export const STAGE_KEYS: readonly StageKey[] = [
  'bloom',
  'pour',
  'drain',
  'steep',
  'stir',
  'press',
  'valve',
  'pause',
];
