/**
 * Что конвертер показывает — одной чистой функцией.
 *
 * Экран не считает ничего сам: `convView` собирает готовые строки и проценты из
 * ответа `domain/convert` (а тот — из `@coffee/core`), и именно эта функция
 * покрыта тестами. В `Conv.tsx` остаются только состояние и разметка, где
 * ошибиться нечем.
 */

import { type Grinder, allGrinders, displayName, grinderById } from '@coffee/core';

import { type StrKey, STR } from '../../../data/strings.js';
import type {
  GrinderRecord,
  GrinderScale,
  GrinderUnit,
  Lang,
  SettingsValues,
} from '../../../db/schema.js';
import type { Span } from '../../../domain/calibration.js';
import { convertFromCatalogue, toCoreGrinder } from '../../../domain/convert.js';
import { type BandGeometry, bandGeometry } from './band.js';

/**
 * Стартовая кофемолка «ОТКУДА» — та же, что на макете (`02-conv.png`).
 * Не найдётся в каталоге — берётся первая запись, экран не должен пустовать.
 */
export const DEFAULT_FROM_ID = 'comandante-c40-mk4';

/** Запись каталога по id, с падением на стартовую и дальше на первую. */
export function resolveFrom(id: string | null): Grinder {
  const picked = id === null ? undefined : grinderById(id);
  if (picked !== undefined) return picked;

  const fallback = grinderById(DEFAULT_FROM_ID);
  if (fallback !== undefined) return fallback;

  const first = allGrinders()[0];
  if (first === undefined) throw new Error('каталог кофемолок пуст');
  return first;
}

/**
 * С какой настройки открывается новая шкала — с середины, снапнутой на засечку.
 *
 * Ноль был бы враньём (жернова в контакте), максимум — тоже. Середина 0–60 даёт
 * 30, ровно то, что стоит на макете, а 0–9 с шагом 0.1 — 4.5.
 */
export function defaultSetting(scale: GrinderScale): number {
  const mid = scale.min + (scale.max - scale.min) / 2;
  const snapped = scale.min + Math.round((mid - scale.min) / scale.step) * scale.step;
  return Number(Math.min(scale.max, Math.max(scale.min, snapped)).toFixed(4));
}

/**
 * Некалиброванный центр — то, от чего отсчитывается смещение (`calApply`,
 * `DC:1250`). Отдельной функцией, чтобы экран не звал конвертер с магическим
 * нулём в четвёртом аргументе.
 */
export function rawCenter(from: Grinder, setting: number, to: GrinderRecord): number {
  return convertFromCatalogue(from, setting, to, 0).center;
}

/** Название деления шкалы: «кликов», «делений», «меток». */
const UNIT_KEY: Record<GrinderUnit, StrKey> = {
  click: 'unit_click',
  number: 'unit_number',
  mark: 'unit_mark',
};

export function unitOf(scale: GrinderScale, lang: Lang): string {
  return STR[lang][UNIT_KEY[scale.unit]];
}

/**
 * Своя кофемолка по кругу (`cycleG`, `DC:987-993`).
 *
 * Меньше двух записей — возврат того же id: перебирать нечего, и экран показывает
 * молку статичной строкой, а не кнопкой, которая ничего не делает.
 */
export function cycleOwn(own: readonly GrinderRecord[], current: string | null): string | null {
  if (own.length === 0) return null;
  if (own.length < 2) return own[0]?.id ?? null;

  const at = own.findIndex((g) => g.id === current);
  return own[(at + 1) % own.length]?.id ?? null;
}

/** Своя кофемолка по id, с падением на первую: `convTo` мог указывать в никуда. */
export function resolveTo(
  own: readonly GrinderRecord[],
  id: string | null,
): GrinderRecord | undefined {
  return own.find((g) => g.id === id) ?? own[0];
}

/**
 * Настройка в границах шкалы. Сохранённое значение могло остаться от другой
 * кофемолки — тогда оно зажимается, а не выбрасывается: человек всё равно
 * увидит его в степпере и поправит одним тапом.
 */
export function clampSetting(value: number, scale: GrinderScale): number {
  if (!Number.isFinite(value)) return defaultSetting(scale);
  return Number(Math.min(scale.max, Math.max(scale.min, value)).toFixed(4));
}

/* ── Сохранённое состояние конвертера ────────────────────────────────────── */

/**
 * Что конвертер помнит между заходами (D-9): обе кофемолки, настройку «ОТКУДА»
 * и калибровку. Ровно из этого он и рисует ответ.
 */
export type ConverterState = Pick<SettingsValues, 'calib' | 'convFrom' | 'convTo' | 'convVal'>;

/** Разрешённые входы конвертера: каталожная запись, настройка, своя кофемолка. */
export interface ConverterInputs {
  from: Grinder;
  setting: number;
  /** `undefined` — своих кофемолок нет, пересчитывать не во что. */
  to: GrinderRecord | undefined;
}

/**
 * Сохранённые настройки → входы конвертера.
 *
 * Одна функция на два экрана: конвертер собирает из этого `convView`, а сетап
 * заваривания — подсказку под помолом. Пока разрешение жило на каждом экране
 * своё, подсказка считала полосу по своей же кофемолке и показывала не то, что
 * человек только что видел на конвертере.
 */
export function converterInputs(
  own: readonly GrinderRecord[],
  state: ConverterState,
): ConverterInputs {
  const from = resolveFrom(state.convFrom);
  return {
    from,
    setting: clampSetting(state.convVal, from.scale),
    to: resolveTo(own, state.convTo),
  };
}

/**
 * Ответ конвертера одним диапазоном — с той же калибровкой, что на его экране.
 * `null`, когда своих кофемолок нет.
 */
export function converterSpan(
  own: readonly GrinderRecord[],
  state: ConverterState,
): Span | null {
  const { from, setting, to } = converterInputs(own, state);
  if (to === undefined) return null;

  const result = convertFromCatalogue(from, setting, to, state.calib.offset);
  return { lo: result.lo, center: result.center, hi: result.hi };
}

/** Предупреждение ядра — тех-строкой под результатом. */
export interface ConvWarning {
  key: 'clamped' | 'estimated';
  text: string;
}

/** Всё, что рисует экран под пикерами. */
export interface ConvView {
  /** Имя исходной кофемолки — «Comandante C40 MK4». */
  fromName: string;
  /** Диапазон и шаг исходной шкалы для степпера значения. */
  fromScale: GrinderScale;
  /** «30 кликов · 730 µm» — тех-строка под значением. */
  tech: string;
  /** Границы главного результата, уже с фиксированной точностью. */
  lo: string;
  hi: string;
  /** Единица результата. Капс делает CSS. */
  unit: string;
  /** «центр 4.6 · 730 µm · разрешение 8.7 мкм/шаг». */
  center: string;
  /**
   * Откалиброванный диапазон числами. Уезжает в сетап заваривания целиком:
   * помол встаёт в центр, а границы остаются подсказкой под полем.
   */
  span: Span;
  band: BandGeometry;
  warnings: ConvWarning[];
}

export interface ConvInput {
  from: Grinder;
  setting: number;
  to: GrinderRecord;
  /** Калибровка в шагах своей кофемолки. */
  offset: number;
  lang: Lang;
}

/** Строка с фиксированной десятой: диапазон прыгал бы шириной без неё. */
function fixed(value: number): string {
  return value.toFixed(1);
}

export function convView({ from, setting, to, offset, lang }: ConvInput): ConvView {
  const t = STR[lang];
  const result = convertFromCatalogue(from, setting, to, offset);

  const fromUnit = unitOf(from.scale, lang);
  const toUnit = unitOf(to.scale, lang);
  const span: Span = { lo: result.lo, center: result.center, hi: result.hi };

  const warnings: ConvWarning[] = [];
  if (result.clamped) warnings.push({ key: 'clamped', text: t.conv_warn_clamped });
  if (from.confidence === 'estimated' || toCoreGrinder(to).confidence === 'estimated')
    warnings.push({ key: 'estimated', text: t.conv_warn_estimated });

  return {
    fromName: displayName(from),
    fromScale: from.scale,
    tech: `${setting} ${fromUnit} · ${result.microns} ${t.um}`,
    lo: fixed(result.lo),
    hi: fixed(result.hi),
    unit: toUnit,
    center: `${t.conv_center} ${result.center} · ${result.microns} ${t.um} · ${t.conv_resolves} ${result.resolutionMicrons} ${t.conv_permark}`,
    span,
    band: bandGeometry(span),
    warnings,
  };
}

/** Счётчик в шапке: «134 кофемолки · база». */
export function dbCountLine(lang: Lang): string {
  return `${allGrinders().length} ${STR[lang].conv_db}`;
}

/** «калибровано +0.4 · из журнала». Знак «+» проставляется руками. */
export function calibLine(offset: number, src: string | null, lang: Lang): string {
  const t = STR[lang];
  const sign = offset > 0 ? '+' : '';
  return `${t.conv_calibrated} ${sign}${offset} · ${src === null ? t.conv_manual : t.conv_from_log}`;
}

/** «из журнала: баланс 8/10 при 4.6». Пусто, когда оценённых заварок нет. */
export function suggestLine(
  best: { grind: number | null; diag: { balance: number } } | undefined,
  lang: Lang,
): string {
  if (best === undefined || best.grind === null) return '';
  const t = STR[lang];
  return `${t.conv_from_log}: ${t.conv_cal_balance} ${best.diag.balance}/10 ${t.conv_cal_at} ${best.grind}`;
}
