/**
 * Свежесть пачки — порт `ageDays`/`phaseOf` (`data.js:44-45`).
 *
 * Прототип брал «сегодня» из захардкоженной константы `TODAY = '2026-08-01'`
 * (спека §7 — расхождение, которое чиним). Здесь дата всегда приходит
 * параметром: приложение живёт дольше одного дня, а тесты должны быть
 * воспроизводимыми.
 */

/** Фаза дегазации кофе после обжарки. */
export type Phase = 'degas' | 'peak' | 'fade';

const MS_PER_DAY = 864e5;

/**
 * Возраст пачки в днях. Обе даты — ISO `YYYY-MM-DD`, они разбираются как
 * полночь UTC, поэтому разница не зависит от часового пояса и летнего времени.
 */
export function ageDays(roast: string, today: string): number {
  return Math.round((new Date(today).getTime() - new Date(roast).getTime()) / MS_PER_DAY);
}

/** Пороги прототипа: до 4 дней — дегазация, по 21-й — пик, дальше спад. */
export function phaseOf(days: number): Phase {
  return days < 4 ? 'degas' : days <= 21 ? 'peak' : 'fade';
}

/**
 * Локальная дата в ISO-формате. Именно локальная, а не `toISOString()`:
 * вечернее заваривание не должно попасть в журнал завтрашним числом.
 */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Локальное время `HH:MM` — формат поля `time` записи журнала. */
export function isoTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
