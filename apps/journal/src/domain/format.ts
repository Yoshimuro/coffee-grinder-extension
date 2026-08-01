/**
 * Форматирование времени.
 *
 * D-3: баг прототипа исправлен. Там минуты брались от неокруглённых секунд, а
 * секунды — от округлённых (`data.js:46`), из-за чего `fmtT(119.6)` давало
 * `"1:00"` вместо `"2:00"`. Здесь обе части считаются от одного округлённого
 * значения.
 */

/** `M:SS`. Отрицательное время (отклонение «раньше цели») сохраняет знак. */
export function fmtT(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.round(seconds);
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}
