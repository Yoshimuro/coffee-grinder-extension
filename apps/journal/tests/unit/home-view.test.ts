import { describe, expect, it } from 'vitest';

import { EMPTY_DIAG } from '../../src/data/seeds.js';
import type { BeanRecord, EntryRecord } from '../../src/db/schema.js';
import {
  FEED_SIZE,
  feedEntries,
  pendingTitle,
  pendingWhen,
  todayLine,
} from '../../src/ui/screens/home/home-view.js';

const TODAY = '2026-08-01';

const java: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};

const entry: EntryRecord = {
  id: 'j1',
  date: TODAY,
  time: '09:12',
  bean: 'java',
  device: null,
  devName: 'V60',
  mode: 'perc',
  grind: 4.4,
  dose: 15,
  water: 250,
  temp: 94,
  total: 168,
  stages: [],
  status: 'pending',
  diag: { ...EMPTY_DIAG },
  desc: [],
  note: '',
};

describe('pendingTitle', () => {
  it('дописывает помол к заголовку', () => {
    expect(pendingTitle(entry, 'ru', { bean: java })).toBe('Ява Золотая · V60 · 4.4');
  });

  it('молчит про помол, когда его нет', () => {
    // Молотый и дрип помола не имеют — «· 0» соврало бы про кофемолку.
    expect(pendingTitle({ ...entry, grind: null }, 'ru', { bean: java })).toBe('Ява Золотая · V60');
  });

  it('переживает удалённую пачку', () => {
    expect(pendingTitle(entry, 'ru')).toBe('— · V60 · 4.4');
  });

  it('называет дегустацию своим именем', () => {
    const cup: EntryRecord = { ...entry, mode: 'cup', bean: null, devName: '', grind: null };
    expect(pendingTitle(cup, 'ru')).toBe('Чашка');
    expect(pendingTitle({ ...cup, title: 'Кофейня на углу' }, 'ru')).toBe('Кофейня на углу');
  });
});

describe('pendingWhen', () => {
  it('пишет «сегодня» вместо сегодняшней даты', () => {
    expect(pendingWhen(entry, 'ru', TODAY)).toBe('сегодня · 09:12');
    expect(pendingWhen(entry, 'en', TODAY)).toBe('today · 09:12');
  });

  it('вчерашнюю записывает числом', () => {
    expect(pendingWhen({ ...entry, date: '2026-07-31', time: '08:47' }, 'ru', TODAY)).toBe(
      '31.07 · 08:47',
    );
  });

  it('зависит от переданного дня, а не от системных часов', () => {
    expect(pendingWhen(entry, 'ru', '2026-08-02')).toBe('01.08 · 09:12');
  });
});

describe('todayLine', () => {
  it('показывает дату в шапке полностью', () => {
    expect(todayLine('2026-08-01')).toBe('01.08.2026');
  });
});

describe('feedEntries', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ ...entry, id: `j${String(i)}` }));

  it('берёт пять последних', () => {
    expect(FEED_SIZE).toBe(5);
    expect(feedEntries(many)).toHaveLength(5);
    expect(feedEntries(many).map((e) => e.id)).toEqual(['j0', 'j1', 'j2', 'j3', 'j4']);
  });

  it('не падает на пустом и незагруженном журнале', () => {
    expect(feedEntries([])).toEqual([]);
    expect(feedEntries(undefined)).toEqual([]);
  });

  it('короткий журнал отдаёт целиком', () => {
    expect(feedEntries(many.slice(0, 2))).toHaveLength(2);
  });
});
