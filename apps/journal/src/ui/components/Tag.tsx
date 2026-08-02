/**
 * Тег — чип в рамку 1px без заливки.
 *
 * Две роли в одном компоненте, потому что рисуются они одинаково:
 *   - статическая метка формы кофе или режима («ЗЕРНО», «ДРИП-ПАКЕТ»);
 *   - выбранный дескриптор вкуса — рамка цветом вкуса, точки интенсивности и
 *     «×» справа (`DC:600-607`).
 *
 * Интенсивность циклится тапом по телу тега: 2 → 3 → 1 → 2 (D-4; в прототипе
 * это `int % 3 + 1`, `DC:1044`). Стартовое значение ставит не тег, а тот, кто
 * дескриптор добавляет, — и это 2.
 */

import { STR } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import type { Intensity } from '../../db/schema.js';
import './components.css';

/** Стартовая интенсивность нового дескриптора (D-4). */
export const START_INTENSITY: Intensity = 2;

/** Следующая интенсивность по кругу: 1 → 2 → 3 → 1. */
export function nextIntensity(current: Intensity): Intensity {
  return ((current % 3) + 1) as Intensity;
}

/** «●●○» — залитых столько, какова интенсивность. */
export function intensityDots(intensity: Intensity): string {
  return '●'.repeat(intensity) + '○'.repeat(3 - intensity);
}

export interface TagProps {
  /** Готовая строка: название дескриптора или метка формы. */
  label: string;
  /** Капс и микро-кегль. По умолчанию да — так выглядят метки формы. */
  caps?: boolean;
  /** Показывает точки. Без него тег статический. */
  intensity?: Intensity;
  /** Тап по телу тега. При заданной `intensity` получает следующую по кругу. */
  onCycle?: (next: Intensity) => void;
  /** Показывает «×» справа. */
  onRemove?: () => void;
  /** Цвет рамки — `colOf(id, 0.8)` для дескрипторов. */
  borderColor?: string;
  /** Цвет точек — `colOf(id)`. */
  dotColor?: string;
}

export function Tag({
  label,
  caps = true,
  intensity,
  onCycle,
  onRemove,
  borderColor,
  dotColor,
}: TagProps) {
  const lang = useLang();
  const interactive = onCycle !== undefined;

  const cls = [
    'bj-tag',
    caps ? 'bj-tag--caps' : 'bj-tag--desc',
    interactive ? 'bj-tag--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <span>{label}</span>
      {intensity === undefined ? null : (
        <span className="bj-tag__dots" style={dotColor ? { color: dotColor } : undefined}>
          {intensityDots(intensity)}
        </span>
      )}
    </>
  );

  return (
    <span className={cls} style={borderColor ? { borderColor } : undefined}>
      {interactive ? (
        <button
          type="button"
          className="bj-tag__body"
          onClick={() => onCycle(nextIntensity(intensity ?? START_INTENSITY))}
        >
          {body}
        </button>
      ) : (
        <span className="bj-tag__body">{body}</span>
      )}

      {onRemove === undefined ? null : (
        <button
          type="button"
          className="bj-tag__remove"
          aria-label={STR[lang].a11y_remove}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
}
