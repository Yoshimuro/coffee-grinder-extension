/**
 * Степпер: «−», значение, «+».
 *
 * Единственный способ ввести число во всём приложении. Помол на сетапе умеет
 * ещё и клавиатуру (`input`), потому что 4.6 набрать быстрее, чем дощёлкать, —
 * и там же живёт запятая: русская раскладка на телефоне даёт «,», а `parseFloat`
 * от неё возвращает NaN. Прототип этого не чинил (`DC:1285`), здесь чинится.
 *
 * Арифметика вынесена в чистые функции ниже и покрыта тестами: зажимы и шаг —
 * это то, что ломается молча.
 */

import { useEffect, useState } from 'react';

import { STR } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import './components.css';

/* ── Арифметика ──────────────────────────────────────────────────────────── */

/** Диапазон и шаг. `decimals` по умолчанию выводится из шага. */
export interface StepperRange {
  min: number;
  max: number;
  step: number;
  decimals?: number;
}

/** Знаков после запятой в шаге: 0.1 → 1, 0.5 → 1, 1 → 0, 5 → 0. */
export function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

function places(range: StepperRange): number {
  return range.decimals ?? decimalsOf(range.step);
}

/**
 * Зажимает значение в диапазон и округляет до знаков шага.
 *
 * Округление обязательно: 0.1 + 0.2 в двоичной плавающей точке даёт
 * 0.30000000000000004, и без него степпер помола показал бы это целиком.
 * Нечисло уезжает в `min` — пустое поле ввода не должно ломать сетап.
 */
export function clampValue(value: number, range: StepperRange): number {
  if (!Number.isFinite(value)) return range.min;
  const bounded = Math.min(range.max, Math.max(range.min, value));
  return Number(bounded.toFixed(places(range)));
}

/** Шаг в одну сторону: `dir` — +1 или −1. Уже зажатый результат. */
export function stepValue(value: number, dir: 1 | -1, range: StepperRange): number {
  const from = Number.isFinite(value) ? value : range.min;
  return clampValue(from + dir * range.step, range);
}

/**
 * Разбор ручного ввода. Запятая переводится в точку, пробелы (в том числе
 * неразрывные, которые приезжают из автозамены) выкидываются.
 * `null` — не число, вызывающий оставляет прежнее значение.
 */
export function parseDecimal(raw: string): number | null {
  const text = raw.replace(',', '.').replace(/[\s ]/g, '');
  if (text === '' || text === '-' || text === '.') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Значение как его видит пользователь: фиксированное число знаков. */
export function formatValue(value: number, range: StepperRange): string {
  return value.toFixed(places(range));
}

/* ── Компонент ───────────────────────────────────────────────────────────── */

export interface StepperProps extends StepperRange {
  /** Микро-лейбл над рядом. Готовая строка из `strings.ts`. */
  label?: string;
  /** Правый угол лейбла — например, соотношение или подсказка формы. */
  labelAside?: string;
  value: number;
  onChange: (value: number) => void;
  /** Единица внутри поля: «г», «°C». Дописывается через пробел. */
  unit?: string;
  /** `md` — 42×48 / 15px (по умолчанию), `lg` — 56×52 / 19px (помол). */
  size?: 'md' | 'lg';
  /** Значение становится полем ввода с запятой и точкой. */
  input?: boolean;
  /**
   * Своё представление значения — когда число и то, что человек про него
   * думает, не совпадают. Клапан гибрида хранится секундами, а читается
   * временем на таймере: 80 → «открыть на 1:20» (`DC:1288`).
   *
   * Только показ: шаг, зажимы и ручной ввод по-прежнему работают с числом.
   * Поэтому с `input` не сочетается — в поле ввода нужно править то же, что в
   * нём написано, и подменённый текст там был бы ловушкой.
   */
  format?: (value: number) => string;
  /** Тех-строка под рядом: диапазон из конвертера и прочее. */
  hint?: string;
  disabled?: boolean;
}

export function Stepper({
  label,
  labelAside,
  value,
  onChange,
  min,
  max,
  step,
  decimals,
  unit,
  size = 'md',
  input = false,
  format,
  hint,
  disabled = false,
}: StepperProps) {
  const lang = useLang();
  const t = STR[lang];
  const range: StepperRange = decimals === undefined ? { min, max, step } : { min, max, step, decimals };

  /* Черновик поля: пока в нём «4,» — это ещё не число, и подставлять туда
     зажатое значение нельзя, иначе курсор прыгает на каждой цифре. */
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);

  const shown = formatValue(value, range);
  const text = draft ?? shown;

  const bump = (dir: 1 | -1) => {
    setDraft(null);
    const next = stepValue(value, dir, range);
    if (next !== value) onChange(next);
  };

  const commit = (raw: string) => {
    const parsed = parseDecimal(raw);
    setDraft(null);
    if (parsed === null) return;
    const next = clampValue(parsed, range);
    if (next !== value) onChange(next);
  };

  return (
    <div className={size === 'lg' ? 'bj-stepper bj-stepper--lg' : 'bj-stepper'}>
      {label === undefined ? null : (
        <div className="bj-stepper__label">
          <span>{label}</span>
          {labelAside === undefined ? null : <span>{labelAside}</span>}
        </div>
      )}

      <div className="bj-stepper__row">
        <button
          type="button"
          className="bj-stepper__btn"
          aria-label={t.a11y_less}
          disabled={disabled || value <= min}
          onClick={() => bump(-1)}
        >
          −
        </button>

        {input ? (
          <input
            className="bj-stepper__value"
            type="text"
            inputMode="decimal"
            value={draft ?? shown}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        ) : (
          <div className="bj-stepper__value">
            {format ? (
              format(value)
            ) : unit === undefined ? (
              text
            ) : (
              <>
                {text}
                <span className="bj-stepper__unit">{unit}</span>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          className="bj-stepper__btn"
          aria-label={t.a11y_more}
          disabled={disabled || value >= max}
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>

      {hint === undefined ? null : <div className="bj-stepper__hint">{hint}</div>}
    </div>
  );
}
