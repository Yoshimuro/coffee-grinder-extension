/**
 * Сетап заваривания — правила показа полей, зажимы и строки.
 *
 * Всё, что здесь есть, — чистые функции: экран только раскладывает результат по
 * разметке. Причина не в стиле, а в том, что таблица §10.11 component-report
 * («какое поле когда видно, с каким шагом и в каких границах») — это правило
 * продукта, и оно должно проверяться тестом, а не глазами по JSX.
 *
 * Диапазоны и шаги перенесены из таблицы дословно (`DC:1287-1299`).
 */

import { STR } from '../../../data/strings.js';
import type {
  BeanForm,
  BeanRecord,
  DeviceRecord,
  GrinderRecord,
  Lang,
} from '../../../db/schema.js';
import type { Span } from '../../../domain/calibration.js';
import { fmtT } from '../../../domain/format.js';
import type { BrewPlan, HybridMode } from '../../../domain/stages.js';
import type { BrewSetup } from '../../../domain/timer.js';
import type { StepperRange } from '../../components/index.js';
import { type ConverterState, converterSpan } from '../conv/model.js';
import type { BrewSetupValues } from './brew-store.js';

/* ── Диапазоны полей (component-report §10.11) ───────────────────────────── */

/** ПОМОЛ: текстовый ввод плюс ±0.1, `[0, 36]` (`DC:1289-1293`). */
export const GRIND_RANGE: StepperRange = { min: 0, max: 36, step: 0.1 };
/** ВЕС: ±0.5, `[8, 40]` (`DC:1295`). */
export const DOSE_RANGE: StepperRange = { min: 8, max: 40, step: 0.5 };
/** ВОДА: ±10, `[80, 900]` (`DC:1297`). */
export const WATER_RANGE: StepperRange = { min: 80, max: 900, step: 10 };
/** ТЕМПЕРАТУРА: ±1, `[70, 100]` (`DC:1298`). */
export const TEMP_RANGE: StepperRange = { min: 70, max: 100, step: 1 };
/** ПРОЛИВЫ: ±1, `[1, 6]` (`DC:1299`). */
export const POURS_RANGE: StepperRange = { min: 1, max: 6, step: 1 };
/** КЛАПАН: ±10 секунд, `[20, 600]` (`DC:1288`). */
export const VALVE_RANGE: StepperRange = { min: 20, max: 600, step: 10 };

/* ── Что показывать ──────────────────────────────────────────────────────── */

/**
 * Дрип-пакет — сам себе воронка: девайс для него не выбирается, и поля девайса
 * не показываются (`DC:1157`).
 */
export function showDevice(form: BeanForm): boolean {
  return form !== 'drip';
}

/** Помол настраивается только у зерна: молотое и дрип смолол производитель. */
export function showGrind(form: BeanForm): boolean {
  return form === 'beans';
}

/** Доза дрипа задана производителем и лежит в пачке — степпера у неё нет. */
export function showDose(form: BeanForm): boolean {
  return form !== 'drip';
}

/** Гибрид выбран — значит, надо решить, что делает клапан. */
export function isHybrid(form: BeanForm, device: DeviceRecord | null): boolean {
  return showDevice(form) && device?.flow === 'hybrid';
}

/** Клапан по времени — единственный режим, где момент открытия задаётся числом. */
export function showValve(
  form: BeanForm,
  device: DeviceRecord | null,
  hyMode: HybridMode,
): boolean {
  return isHybrid(form, device) && hyMode === 'mid';
}

/**
 * Проливы влияют только на дрип и перколяцию (включая гибрид в режиме пролива)
 * — в иммерсии лить нечего, там одна стадия настаивания (`DC:1299`).
 */
export function showPours(
  form: BeanForm,
  device: DeviceRecord | null,
  hyMode: HybridMode,
): boolean {
  if (form === 'drip') return true;
  if (!showDevice(form) || !device) return false;
  return device.flow === 'perc' || (device.flow === 'hybrid' && hyMode === 'perc');
}

/* ── Строки ──────────────────────────────────────────────────────────────── */

const SEP = ' · ';

/*
 * Подписи пачки переехали в `ui/bean-format.ts` (S-6): те же три функции нужны
 * полке, карточке пачки и ленте журнала, и держать их здесь значило бы иметь
 * четыре копии одного формата. Реэкспорт оставлен, чтобы импорты экрана и
 * тестов группы не переписывались.
 */
export { beanTech, formLabel, leftLabel } from '../../bean-format.js';

/**
 * Доза, которая реально участвует в расчёте: у дрипа её задал производитель и
 * степпера для неё нет (`DC:1160`).
 */
export function effectiveDose(bean: BeanRecord | null, setupDose: number): number {
  if (!bean) return setupDose;
  return bean.form === 'drip' ? (bean.dose ?? 0) : setupDose;
}

/** Соотношение в шапке: `1:16.7` (`ratioLine`, `DC:1281`). */
export function ratioLine(water: number, dose: number, lang: Lang): string {
  if (!Number.isFinite(dose) || dose <= 0) return STR[lang].entry_none;
  return `1:${(water / dose).toFixed(1)}`;
}

/**
 * Диапазон помола для подсказки.
 *
 * Прототип показывал здесь текущий ответ конвертера, храня его настройку
 * «откуда» в состоянии экрана (`convVal`, `DC:917`). Теперь она лежит в
 * настройках (D-9), поэтому источник один и тот же на обоих экранах:
 *   - `span` из стора — ответ, который человек сам отправил сюда кнопкой
 *     «ВЗЯТЬ В ЗАВАРИВАНИЕ»: он победил бы в любом случае;
 *   - иначе — сохранённое состояние конвертера, посчитанное `converterSpan`.
 *
 * Раньше вторым вариантом была полоса вокруг настройки на своей же кофемолке.
 * Числа получались честные, но не те, что показывает конвертер, и подсказка
 * спорила с экраном, с которого её и переписывают.
 */
export function grindSpan(
  own: readonly GrinderRecord[],
  state: ConverterState,
  span: Span | null,
): Span | null {
  return span ?? converterSpan(own, state);
}

/**
 * Клапан в степпере: «открыть на 1:20» (`DC:1288`).
 *
 * Хранится значение секундами — с ним считает `stagesFor`, — а показывается
 * временем на таймере: на 80-й секунде человек смотрит не на «80 с», а на
 * «1:20». Показ развели с числом через `format` у `Stepper` (S-6).
 */
export function valveLabel(seconds: number, lang: Lang): string {
  return `${STR[lang].t_valve.toLowerCase()} ${fmtT(seconds)}`;
}

/** `конвертер: 3.2 — 6.0 · центр 4.6` (`grindHint`, `DC:1294`). */
export function grindHint(span: Span | null, lang: Lang): string | undefined {
  if (!span) return undefined;
  const t = STR[lang];
  return `${t.brew_conv}: ${span.lo.toFixed(1)} — ${span.hi.toFixed(1)}${SEP}${t.conv_center} ${span.center}`;
}

/* ── Сборка плана ────────────────────────────────────────────────────────── */

/**
 * Сетап экрана → вход генератора стадий. Девайс подставляется записью, а не
 * идентификатором: `stagesFor` смотрит на `flow` и `bottom`.
 */
export function brewPlan(
  values: BrewSetupValues,
  bean: BeanRecord,
  device: DeviceRecord | null,
): BrewPlan {
  const dev = showDevice(bean.form) ? device : null;
  return {
    form: bean.form,
    device: dev,
    hyMode: values.hyMode,
    dose: effectiveDose(bean, values.dose),
    water: values.water,
    pours: values.pours,
    valveAt: values.valveAt,
  };
}

/** План плюс то, что нужно только записи журнала: помол и температура. */
export function brewSetup(
  values: BrewSetupValues,
  bean: BeanRecord,
  device: DeviceRecord | null,
): BrewSetup {
  return {
    ...brewPlan(values, bean, device),
    grind: showGrind(bean.form) ? values.grind : null,
    temp: values.temp,
  };
}
