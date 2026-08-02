import { describe, expect, it } from 'vitest';

import {
  canShiftMonth,
  dayISO,
  daysInMonth,
  firstWeekday,
  inRange,
  monthGrid,
  monthIndex,
  monthOf,
  parseISO,
  shiftMonth,
  toISO,
  yearBefore,
} from '../../src/ui/components/DatePicker.js';

/** Границы поля даты обжарки: год назад от «сегодня» и само «сегодня». */
const MIN = '2025-08-02';
const MAX = '2026-08-02';
/** Открытый месяц по умолчанию — месяц верхней границы. */
const AUG = { year: 2026, month: 8 };

describe('parseISO / toISO', () => {
  it('разбирает ISO по срезам, без часовых поясов', () => {
    expect(parseISO('2026-08-02')).toEqual({ year: 2026, month: 8, day: 2 });
    expect(parseISO('2026-01-31')).toEqual({ year: 2026, month: 1, day: 31 });
  });

  it('собирает обратно с ведущими нулями', () => {
    expect(toISO({ year: 2026, month: 1, day: 5 })).toBe('2026-01-05');
    expect(toISO(parseISO(MIN))).toBe(MIN);
  });

  it('месяц даты — без числа', () => {
    expect(monthOf('2026-08-02')).toEqual(AUG);
    expect(monthOf('2025-12-31')).toEqual({ year: 2025, month: 12 });
  });

  it('склеивает число с показанным месяцем', () => {
    expect(dayISO(AUG, 2)).toBe('2026-08-02');
    expect(dayISO({ year: 2026, month: 11 }, 30)).toBe('2026-11-30');
  });
});

describe('daysInMonth', () => {
  it('различает 31 и 30 дней', () => {
    expect(daysInMonth({ year: 2026, month: 8 })).toBe(31);
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(31);
    expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
    expect(daysInMonth({ year: 2026, month: 11 })).toBe(30);
  });

  it('считает февраль високосным по правилу, а не по чётности', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    /* Вековые: 1900 — не високосный, 2000 — високосный. */
    expect(daysInMonth({ year: 1900, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2000, month: 2 })).toBe(29);
  });
});

describe('firstWeekday', () => {
  it('считает неделю с понедельника: ПН — 0, ВС — 6', () => {
    /* 1 августа 2026 — суббота, шестой день недели. */
    expect(firstWeekday(AUG)).toBe(5);
    /* 1 марта 2027 — понедельник, смещения нет. */
    expect(firstWeekday({ year: 2027, month: 3 })).toBe(0);
    /* 1 февраля 2026 — воскресенье, последняя колонка. */
    expect(firstWeekday({ year: 2026, month: 2 })).toBe(6);
    /* 1 февраля 2028 — вторник. */
    expect(firstWeekday({ year: 2028, month: 2 })).toBe(1);
  });
});

describe('monthGrid', () => {
  it('ставит перед единицей ровно столько пустот, сколько смещение', () => {
    const cells = monthGrid(AUG);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, 1]);
    expect(cells).toHaveLength(5 + 31);
    expect(cells.at(-1)).toBe(31);
  });

  it('не теряет и не выдумывает числа в коротких месяцах', () => {
    const april = monthGrid({ year: 2026, month: 4 });
    expect(april.filter((cell) => cell !== null)).toHaveLength(30);
    expect(april).toHaveLength(2 + 30);

    const feb = monthGrid({ year: 2026, month: 2 });
    expect(feb.filter((cell) => cell !== null)).toHaveLength(28);
    /* Воскресный старт: шесть пустот, потом единица. */
    expect(feb).toHaveLength(6 + 28);
  });

  it('показывает 29-е в високосном феврале', () => {
    const feb = monthGrid({ year: 2028, month: 2 });
    expect(feb).toHaveLength(1 + 29);
    expect(feb.at(-1)).toBe(29);
    expect(feb[0]).toBeNull();
    expect(feb[1]).toBe(1);
  });

  it('месяц с понедельника обходится без пустот', () => {
    expect(monthGrid({ year: 2027, month: 3 })[0]).toBe(1);
  });
});

describe('shiftMonth', () => {
  it('листает в пределах года', () => {
    expect(shiftMonth(AUG, 1)).toEqual({ year: 2026, month: 9 });
    expect(shiftMonth(AUG, -1)).toEqual({ year: 2026, month: 7 });
  });

  it('переходит через декабрь и январь, меняя год', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('не копит смещения на длинной серии', () => {
    let ym = AUG;
    for (let i = 0; i < 12; i++) ym = shiftMonth(ym, -1);
    expect(ym).toEqual({ year: 2025, month: 8 });
    for (let i = 0; i < 12; i++) ym = shiftMonth(ym, 1);
    expect(ym).toEqual(AUG);
  });

  it('порядковый номер месяца растёт монотонно', () => {
    expect(monthIndex({ year: 2026, month: 9 })).toBe(monthIndex(AUG) + 1);
    expect(monthIndex({ year: 2027, month: 1 })).toBe(monthIndex({ year: 2026, month: 12 }) + 1);
  });
});

describe('canShiftMonth', () => {
  it('в середине диапазона листается в обе стороны', () => {
    const jan = { year: 2026, month: 1 };
    expect(canShiftMonth(jan, -1, MIN, MAX)).toBe(true);
    expect(canShiftMonth(jan, 1, MIN, MAX)).toBe(true);
  });

  it('в месяце верхней границы вперёд не пускает', () => {
    expect(canShiftMonth(AUG, 1, MIN, MAX)).toBe(false);
    expect(canShiftMonth(AUG, -1, MIN, MAX)).toBe(true);
  });

  it('в месяце нижней границы назад не пускает', () => {
    const start = { year: 2025, month: 8 };
    expect(canShiftMonth(start, -1, MIN, MAX)).toBe(false);
    expect(canShiftMonth(start, 1, MIN, MAX)).toBe(true);
  });

  it('границы в одном месяце запирают обе стрелки', () => {
    expect(canShiftMonth(AUG, -1, '2026-08-01', '2026-08-02')).toBe(false);
    expect(canShiftMonth(AUG, 1, '2026-08-01', '2026-08-02')).toBe(false);
  });
});

describe('inRange', () => {
  it('пускает обе границы включительно', () => {
    expect(inRange(MIN, MIN, MAX)).toBe(true);
    expect(inRange(MAX, MIN, MAX)).toBe(true);
    expect(inRange('2026-01-15', MIN, MAX)).toBe(true);
  });

  it('не пускает соседние с границами дни', () => {
    expect(inRange('2025-08-01', MIN, MAX)).toBe(false);
    expect(inRange('2026-08-03', MIN, MAX)).toBe(false);
  });

  it('сравнивает по календарю, а не по длине строки', () => {
    expect(inRange('2025-09-01', MIN, MAX)).toBe(true);
    expect(inRange('2025-07-31', MIN, MAX)).toBe(false);
    expect(inRange('2026-12-31', MIN, MAX)).toBe(false);
  });
});

describe('yearBefore', () => {
  it('отнимает год, оставляя число и месяц', () => {
    expect(yearBefore('2026-08-02')).toBe('2025-08-02');
    expect(yearBefore('2027-01-01')).toBe('2026-01-01');
    expect(yearBefore('2026-12-31')).toBe('2025-12-31');
  });

  it('прижимает 29 февраля к 28-му, а не перескакивает на март', () => {
    expect(yearBefore('2028-02-29')).toBe('2027-02-28');
    /* Год до високосного — 29-е сохраняется. */
    expect(yearBefore('2025-02-28')).toBe('2024-02-28');
  });

  it('даёт нижнюю границу, которая сама лежит в диапазоне', () => {
    const min = yearBefore(MAX);
    expect(min).toBe(MIN);
    expect(inRange(min, min, MAX)).toBe(true);
    expect(inRange(MAX, min, MAX)).toBe(true);
  });
});
