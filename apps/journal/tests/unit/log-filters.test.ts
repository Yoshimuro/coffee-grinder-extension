import { describe, expect, it } from 'vitest';

import { filterKey, matchesFilter } from '../../src/db/repo/entries.js';
import type { BeanRecord, EntryRecord } from '../../src/db/schema.js';
import {
  FILTER_MODES,
  filterLabel,
  logFilters,
} from '../../src/ui/screens/journal/log-filters.js';

const BEANS: BeanRecord[] = [
  { id: 'java', form: 'beans', name: 'Ява Золотая', roast: '2026-07-27', photos: [] },
  { id: 'drip1', form: 'drip', name: 'Дрип · Колумбия Уила', roast: '2026-07-10', photos: [] },
  { id: 'kenya', form: 'ground', name: 'Кения Ньери (вашд)', roast: '2026-07-18', photos: [] },
];

function entry(patch: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'j1',
    date: '2026-07-31',
    time: '08:47',
    bean: 'java',
    device: 'v60',
    devName: 'Hario V60-02',
    mode: 'perc',
    grind: 4.8,
    dose: 15,
    water: 250,
    temp: 94,
    total: 170,
    stages: [],
    status: 'done',
    diag: { acid: 5, bitter: 4, body: 6, balance: 6 },
    desc: [],
    note: '',
    ...patch,
  };
}

describe('logFilters — состав ленты', () => {
  it('«ВСЁ», затем пачки, затем пять режимов', () => {
    const filters = logFilters(BEANS);
    expect(filters).toHaveLength(1 + BEANS.length + FILTER_MODES.length);
    expect(filters.map(filterKey)).toEqual([
      'all',
      'java',
      'drip1',
      'kenya',
      'm-perc',
      'm-imm',
      'm-hybrid',
      'm-drip',
      'm-cup',
    ]);
  });

  it('на пустой полке остаются «ВСЁ» и режимы', () => {
    expect(logFilters([]).map(filterKey)).toEqual([
      'all',
      'm-perc',
      'm-imm',
      'm-hybrid',
      'm-drip',
      'm-cup',
    ]);
  });

  it('ключи чипов уникальны — иначе лента дублировала бы отбор', () => {
    const keys = logFilters(BEANS).map(filterKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('filterLabel', () => {
  it('обрезает имя пачки по « ·» и « (»', () => {
    const [, java, drip, kenya] = logFilters(BEANS);
    expect(filterLabel(java!, 'ru', BEANS)).toBe('Ява Золотая');
    expect(filterLabel(drip!, 'ru', BEANS)).toBe('Дрип');
    expect(filterLabel(kenya!, 'ru', BEANS)).toBe('Кения Ньери');
  });

  it('называет режимы коротко и в обоих языках', () => {
    const modes = logFilters([]).slice(1);
    expect(modes.map((f) => filterLabel(f, 'ru', []))).toEqual([
      'ПРОЛИВ',
      'ИММЕРСИЯ',
      'ГИБРИД',
      'ДРИП',
      'ЧАШКИ',
    ]);
    expect(modes.map((f) => filterLabel(f, 'en', []))).toEqual([
      'PERC',
      'IMM',
      'HYBRID',
      'DRIP',
      'CUPS',
    ]);
  });

  it('«ВСЁ» берётся из таблицы строк', () => {
    expect(filterLabel({ kind: 'all' }, 'ru', BEANS)).toBe('ВСЁ');
    expect(filterLabel({ kind: 'all' }, 'en', BEANS)).toBe('ALL');
  });

  it('удалённая пачка не оставляет пустой чип', () => {
    expect(filterLabel({ kind: 'bean', bean: 'gone' }, 'ru', BEANS)).toBe('—');
  });
});

describe('предикат ленты', () => {
  it('«ВСЁ» пропускает любую запись, включая дегустацию', () => {
    expect(matchesFilter(entry(), { kind: 'all' })).toBe(true);
    expect(matchesFilter(entry({ mode: 'cup', bean: null }), { kind: 'all' })).toBe(true);
  });

  it('отбор по режиму не задевает соседние режимы', () => {
    const perc = entry();
    const cup = entry({ id: 'j2', mode: 'cup', bean: null });
    expect(matchesFilter(perc, { kind: 'mode', mode: 'perc' })).toBe(true);
    expect(matchesFilter(perc, { kind: 'mode', mode: 'cup' })).toBe(false);
    expect(matchesFilter(cup, { kind: 'mode', mode: 'cup' })).toBe(true);
  });

  it('отбор по пачке не подхватывает записи без пачки', () => {
    expect(matchesFilter(entry(), { kind: 'bean', bean: 'java' })).toBe(true);
    expect(matchesFilter(entry({ bean: null }), { kind: 'bean', bean: 'java' })).toBe(false);
  });

  it('каждый чип ленты — рабочий отбор', () => {
    const rows = [entry(), entry({ id: 'j2', mode: 'drip', bean: 'drip1', device: null })];
    for (const f of logFilters(BEANS)) {
      expect(() => rows.filter((e) => matchesFilter(e, f))).not.toThrow();
    }
    const drip = logFilters(BEANS).find((f) => filterKey(f) === 'm-drip')!;
    expect(rows.filter((e) => matchesFilter(e, drip)).map((e) => e.id)).toEqual(['j2']);
  });
});
