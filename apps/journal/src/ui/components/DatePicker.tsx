/**
 * Календарь даты обжарки — инлайн-панель, а не модалка.
 *
 * Поле даты остаётся текстовым с автомаской: нативный `<input type="date">`
 * WebView рисует чужими цветами и шрифтом (см. `parseDate` в `bean-format.ts`),
 * поэтому пикер свой. Панель раскрывается в потоке под полем — модальное окно
 * в этом интерфейсе не появляется ни разу, и заводить его ради выбора числа
 * было бы отдельным жанром.
 *
 * «Сегодня» компонент не знает: и верхняя граница, и открытый месяц приходят
 * пропами. Ни `Date.now()`, ни `new Date()` без аргументов здесь нет — только
 * `Date.UTC` от разобранных ISO-строк, иначе тесты врали бы в зависимости от
 * часового пояса машины, а пачка, заведённая вечером, получала бы завтрашнюю
 * дату.
 *
 * Арифметика вынесена в чистые функции ниже и покрыта тестами: високосный
 * февраль, смещение первого числа и переход через декабрь — это то, что
 * ломается молча.
 */

import { useEffect, useState } from 'react';

import { STR } from '../../data/strings.js';
import type { StrKey } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import './components.css';

/* ── Арифметика ──────────────────────────────────────────────────────────── */

/** Месяц календаря. `month` — человеческий, 1…12, а не индекс `Date`. */
export interface YearMonth {
  year: number;
  month: number;
}

/** Разобранная ISO-дата. */
export interface CalDate extends YearMonth {
  day: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Разбор `YYYY-MM-DD`. Срезами, а не `new Date`: конструктор зависит от зоны. */
export function parseISO(iso: string): CalDate {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

/** Обратно в `YYYY-MM-DD` с ведущими нулями. */
export function toISO({ year, month, day }: CalDate): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Месяц, в котором лежит дата. */
export function monthOf(iso: string): YearMonth {
  const { year, month } = parseISO(iso);
  return { year, month };
}

/** ISO конкретного числа показанного месяца. */
export function dayISO(ym: YearMonth, day: number): string {
  return toISO({ ...ym, day });
}

/**
 * Дней в месяце. Нулевое число следующего месяца — это последнее число
 * текущего, поэтому високосные февраля (и вековые исключения вроде 1900-го)
 * считает сам движок дат, а не таблица в коде.
 */
export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * День недели первого числа, неделя с понедельника: ПН — 0, ВС — 6. Столько же
 * пустых ячеек стоит в сетке перед единицей.
 */
export function firstWeekday({ year, month }: YearMonth): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

/**
 * Сетка месяца: ведущие пустоты (`null`) и дальше числа подряд. Хвост до
 * полной недели не добивается — пустая ячейка в конце ничем не отличается от
 * её отсутствия, а лишних узлов в DOM меньше.
 */
export function monthGrid(ym: YearMonth): (number | null)[] {
  const cells: (number | null)[] = [];
  for (let i = firstWeekday(ym); i > 0; i--) cells.push(null);
  for (let day = 1, total = daysInMonth(ym); day <= total; day++) cells.push(day);
  return cells;
}

/** Порядковый номер месяца от нулевого года — им сравниваются границы. */
export function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1);
}

/** Соседний месяц. Через декабрь и январь переходит счётом, а не условиями. */
export function shiftMonth(ym: YearMonth, dir: 1 | -1): YearMonth {
  const index = monthIndex(ym) + dir;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Осталось ли в эту сторону хоть одно доступное число. Ложь, когда показанный
 * месяц — тот же, что у границы: за ним выбирать нечего, и стрелка гаснет.
 */
export function canShiftMonth(ym: YearMonth, dir: 1 | -1, min: string, max: string): boolean {
  const here = monthIndex(ym);
  const edge = monthIndex(monthOf(dir === -1 ? min : max));
  return dir === -1 ? here > edge : here < edge;
}

/**
 * Дата внутри границ, обе включительно. ISO с ведущими нулями сравнивается
 * посимвольно так же, как хронологически, — разбор для этого не нужен.
 */
export function inRange(iso: string, min: string, max: string): boolean {
  return iso >= min && iso <= max;
}

/**
 * Та же дата годом раньше — нижняя граница выбора: пачку старше года заводить
 * незачем. 29 февраля в невисокосном году не существует, поэтому число
 * прижимается к последнему в месяце: '2028-02-29' → '2027-02-28'. Смысл
 * границы от этого только расширяется на день, а перескок на 1 марта выглядел
 * бы как ошибка.
 */
export function yearBefore(iso: string): string {
  const { year, month, day } = parseISO(iso);
  const target: YearMonth = { year: year - 1, month };
  return toISO({ ...target, day: Math.min(day, daysInMonth(target)) });
}

/* ── Подписи ─────────────────────────────────────────────────────────────── */

/** Имена месяцев по номеру: из номера они не выводятся, только ключом. */
const MONTHS: readonly StrKey[] = [
  'cal_jan',
  'cal_feb',
  'cal_mar',
  'cal_apr',
  'cal_may',
  'cal_jun',
  'cal_jul',
  'cal_aug',
  'cal_sep',
  'cal_oct',
  'cal_nov',
  'cal_dec',
];

/** Шапка недели, с понедельника — в обоих языках. */
const WEEKDAYS: readonly StrKey[] = ['cal_mo', 'cal_tu', 'cal_we', 'cal_th', 'cal_fr', 'cal_sa', 'cal_su'];

/**
 * Ключ месяца по человеческому номеру 1…12. Номер приходит из `monthOf` и
 * `shiftMonth` и за пределы не выходит; `??` — уступка noUncheckedIndexedAccess,
 * а не рабочая ветка.
 */
function monthKey(month: number): StrKey {
  return MONTHS[month - 1] ?? 'cal_jan';
}

/* ── Компонент ───────────────────────────────────────────────────────────── */

export interface DatePickerProps {
  /** ISO выбранной даты — открыться на её месяце; null — на месяце max. */
  value: string | null;
  /** Нижняя граница выбора, включительно (ISO `YYYY-MM-DD`). */
  min: string;
  /** Верхняя граница, включительно, — сегодня (ISO). */
  max: string;
  /** Тап по дню. Родитель сам закрывает панель. */
  onPick: (iso: string) => void;
}

export function DatePicker({ value, min, max, onPick }: DatePickerProps) {
  const lang = useLang();
  const t = STR[lang];

  const [shown, setShown] = useState<YearMonth>(() => monthOf(value ?? max));

  /* Дата правится и текстовым полем рядом; пока панель открыта, она обязана
     показывать месяц набранного числа. Стрелки `value` не трогают, поэтому
     ручную перелистку этот эффект не отматывает. */
  useEffect(() => {
    if (value !== null) setShown(monthOf(value));
  }, [value]);

  const cells = monthGrid(shown);

  return (
    <div className="bj-cal" data-testid="date-picker">
      <div className="bj-cal__head">
        <button
          type="button"
          className="bj-cal__nav"
          aria-label={t.cal_prev}
          data-testid="cal-prev"
          disabled={!canShiftMonth(shown, -1, min, max)}
          onClick={() => setShown(shiftMonth(shown, -1))}
        >
          ←
        </button>

        <div className="bj-cal__title">
          {t[monthKey(shown.month)]} {shown.year}
        </div>

        <button
          type="button"
          className="bj-cal__nav"
          aria-label={t.cal_next}
          data-testid="cal-next"
          disabled={!canShiftMonth(shown, 1, min, max)}
          onClick={() => setShown(shiftMonth(shown, 1))}
        >
          →
        </button>
      </div>

      <div className="bj-cal__week">
        {WEEKDAYS.map((key) => (
          <span key={key}>{t[key]}</span>
        ))}
      </div>

      <div className="bj-cal__grid">
        {cells.map((day, index) => {
          if (day === null) return <span key={`lead-${index}`} className="bj-cal__blank" />;

          const iso = dayISO(shown, day);
          const picked = iso === value;

          return (
            <button
              key={iso}
              type="button"
              className={picked ? 'bj-cal__day bj-cal__day--on' : 'bj-cal__day'}
              data-testid="cal-day"
              aria-current={picked ? 'date' : undefined}
              disabled={!inRange(iso, min, max)}
              onClick={() => onPick(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
