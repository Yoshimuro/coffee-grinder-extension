import { afterEach, describe, expect, it } from 'vitest';

import { useNav } from '../../src/app/nav.js';
import type { Descriptor, EntryRecord } from '../../src/db/schema.js';
import { intensityDots, nextIntensity } from '../../src/ui/components/Tag.js';
import {
  cyclePicked,
  isPickedIn,
  removePicked,
  setPickedIntensity,
  suggestFromText,
  togglePicked,
  useRate,
} from '../../src/ui/screens/journal/rate-store.js';
import { orderPair } from '../../src/ui/screens/journal/view-store.js';

const PICKED: Descriptor[] = [
  ['blueberry', 2],
  ['honey', 3],
];

describe('набор дескрипторов', () => {
  it('новый добавляется с интенсивностью 2 (D-4)', () => {
    expect(togglePicked([], 'cocoa')).toEqual([['cocoa', 2]]);
  });

  it('повторный тап снимает выбор', () => {
    expect(togglePicked(PICKED, 'honey')).toEqual([['blueberry', 2]]);
  });

  it('исходный список не мутируется', () => {
    togglePicked(PICKED, 'cocoa');
    expect(PICKED).toHaveLength(2);
  });

  it('порядок сохраняется — набор читается как история выбора', () => {
    expect(togglePicked(PICKED, 'cocoa').map(([id]) => id)).toEqual([
      'blueberry',
      'honey',
      'cocoa',
    ]);
  });

  it('isPickedIn отвечает по id', () => {
    expect(isPickedIn(PICKED, 'honey')).toBe(true);
    expect(isPickedIn(PICKED, 'cocoa')).toBe(false);
  });

  it('removePicked выкидывает один и только один', () => {
    expect(removePicked(PICKED, 'blueberry')).toEqual([['honey', 3]]);
    expect(removePicked(PICKED, 'cocoa')).toHaveLength(2);
  });
});

describe('интенсивность', () => {
  it('циклится 1 → 2 → 3 → 1', () => {
    expect(nextIntensity(1)).toBe(2);
    expect(nextIntensity(2)).toBe(3);
    expect(nextIntensity(3)).toBe(1);
  });

  it('точки показывают залитыми ровно интенсивность', () => {
    expect(intensityDots(1)).toBe('●○○');
    expect(intensityDots(2)).toBe('●●○');
    expect(intensityDots(3)).toBe('●●●');
  });

  it('cyclePicked двигает только нужный тег', () => {
    expect(cyclePicked(PICKED, 'blueberry')).toEqual([
      ['blueberry', 3],
      ['honey', 3],
    ]);
    expect(cyclePicked(PICKED, 'honey')).toEqual([
      ['blueberry', 2],
      ['honey', 1],
    ]);
  });

  it('setPickedIntensity ставит значение напрямую', () => {
    expect(setPickedIntensity(PICKED, 'honey', 1)).toEqual([
      ['blueberry', 2],
      ['honey', 1],
    ]);
  });
});

describe('suggestFromText', () => {
  it('находит названия дескрипторов в реплике', () => {
    expect(suggestFromText('черника и мёд, чище на остывании', 'ru')).toEqual([
      'blueberry',
      'honey',
    ]);
  });

  it('работает в английском', () => {
    expect(suggestFromText('blueberry and honey, cleaner as it cools', 'en')).toEqual([
      'blueberry',
      'honey',
    ]);
  });

  it('не предлагает уже выбранное', () => {
    expect(suggestFromText('черника и мёд', 'ru', [['blueberry', 2]])).toEqual(['honey']);
  });

  it('на пустой реплике молчит', () => {
    expect(suggestFromText('', 'ru')).toEqual([]);
    expect(suggestFromText('вкусно', 'ru')).toEqual([]);
  });
});

/* ── Передача в другие экраны ────────────────────────────────────────────── */

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

/*
 * Экраны «оценка позже» и «оценка ждёт» уходят на диагностику простым
 * `go('diag')`, без параметров: запись подхватывается поиском ждущей оценки.
 * Работает это, только пока брошенная сессия не переживает уход с экрана.
 */
describe('жизнь сессии оценки', () => {
  afterEach(() => {
    useRate.getState().reset();
    useNav.setState({ screen: 'home', stack: [] });
  });

  it('переживает переход диагностика → колесо и обратно', () => {
    useNav.setState({ screen: 'diag', stack: ['home'] });
    useRate.getState().startRating('j1');
    useRate.getState().togglePick('cocoa');

    useNav.getState().go('wheel');
    expect(useRate.getState().target).toEqual({ kind: 'entry', id: 'j1' });

    useNav.getState().back();
    expect(useRate.getState().picked).toEqual([['cocoa', 2]]);
  });

  it('заканчивается, когда человек ушёл с диагностики', () => {
    useNav.setState({ screen: 'diag', stack: ['home'] });
    useRate.getState().startTasting();
    useRate.getState().setNote('черника');

    useNav.getState().back();
    expect(useRate.getState().target).toBeNull();
    expect(useRate.getState().note).toBe('');
  });

  it('брошенная дегустация не мешает оценить следующее заваривание', () => {
    useNav.setState({ screen: 'diag', stack: ['home'] });
    useRate.getState().startTasting();
    useNav.getState().back();

    // Экран диагностики подхватывает ждущую запись только при пустой сессии.
    expect(useRate.getState().target).toBeNull();
  });
});

describe('orderPair — A всегда новее B', () => {
  it('сортирует по дате', () => {
    const older = entry({ id: 'old', date: '2026-07-29' });
    const newer = entry({ id: 'new', date: '2026-07-31' });
    expect(orderPair(older, newer)).toEqual(['new', 'old']);
    expect(orderPair(newer, older)).toEqual(['new', 'old']);
  });

  it('при равной дате решает время', () => {
    const morning = entry({ id: 'am', time: '08:47' });
    const evening = entry({ id: 'pm', time: '19:10' });
    expect(orderPair(morning, evening)).toEqual(['pm', 'am']);
  });
});
