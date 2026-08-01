import { describe, expect, it } from 'vitest';

import { advice } from '../../src/data/advice.js';
import { ageDays, isoDate, isoTime, phaseOf } from '../../src/data/freshness.js';

describe('ageDays', () => {
  it('считает дни между обжаркой и переданным «сегодня»', () => {
    expect(ageDays('2026-07-27', '2026-08-01')).toBe(5);
    expect(ageDays('2026-08-01', '2026-08-01')).toBe(0);
    expect(ageDays('2026-07-10', '2026-08-01')).toBe(22);
  });

  it('не зависит от захардкоженной даты — «сегодня» всегда параметр', () => {
    expect(ageDays('2026-07-27', '2027-01-01')).toBe(158);
  });

  it('обжарка в будущем даёт отрицательный возраст', () => {
    expect(ageDays('2026-08-05', '2026-08-01')).toBe(-4);
  });
});

describe('phaseOf', () => {
  it('держит пороги прототипа: <4 дегазация, ≤21 пик, дальше спад', () => {
    expect(phaseOf(0)).toBe('degas');
    expect(phaseOf(3)).toBe('degas');
    expect(phaseOf(4)).toBe('peak');
    expect(phaseOf(21)).toBe('peak');
    expect(phaseOf(22)).toBe('fade');
    expect(phaseOf(365)).toBe('fade');
  });
});

describe('isoDate / isoTime', () => {
  it('форматируют локальные дату и время с ведущими нулями', () => {
    const d = new Date(2026, 7, 1, 9, 5);
    expect(isoDate(d)).toBe('2026-08-01');
    expect(isoTime(d)).toBe('09:05');
  });

  it('берут локальную полночь, а не UTC', () => {
    const lateEvening = new Date(2026, 7, 1, 23, 59);
    expect(isoDate(lateEvening)).toBe('2026-08-01');
  });
});

describe('advice — подсказки диагностики (D-6: портирована, к UI не подключена)', () => {
  it('кисло и не горько — мельче', () => {
    expect(advice({ acid: 8, bitter: 3, body: 5, balance: 5 }, 'ru')).toEqual([
      'мельче на 0.5 · или горячее на 2°',
    ]);
    expect(advice({ acid: 8, bitter: 3, body: 5, balance: 5 }, 'en')).toEqual([
      'grind 0.5 finer · or 2° hotter',
    ]);
  });

  it('горько и не кисло — крупнее', () => {
    expect(advice({ acid: 3, bitter: 8, body: 5, balance: 5 }, 'ru')).toEqual([
      'крупнее на 0.5 · или холоднее на 2°',
    ]);
  });

  it('правила накапливаются', () => {
    expect(advice({ acid: 3, bitter: 8, body: 2, balance: 4 }, 'ru')).toEqual([
      'крупнее на 0.5 · или холоднее на 2°',
      'дольше контакт · или мельче на 0.3',
    ]);
  });

  it('плотное тело при слабом балансе — меньше доза', () => {
    expect(advice({ acid: 5, bitter: 5, body: 9, balance: 4 }, 'en')).toEqual([
      'lower dose · or 0.3 coarser',
    ]);
  });

  it('ничего не сработало — по балансу', () => {
    expect(advice({ acid: 5, bitter: 5, body: 5, balance: 8 }, 'ru')).toEqual([
      'повторить без изменений',
    ]);
    expect(advice({ acid: 5, bitter: 5, body: 5, balance: 5 }, 'ru')).toEqual([
      'менять один параметр за раз',
    ]);
  });

  it('никогда не возвращает пустой список', () => {
    for (let acid = 0; acid <= 10; acid += 2)
      for (let bitter = 0; bitter <= 10; bitter += 2)
        for (let body = 0; body <= 10; body += 2)
          for (let balance = 0; balance <= 10; balance += 2)
            expect(advice({ acid, bitter, body, balance }, 'ru').length).toBeGreaterThan(0);
  });
});
