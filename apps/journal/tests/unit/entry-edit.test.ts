import { describe, expect, it } from 'vitest';

import type { EntryRecord } from '../../src/db/schema.js';
import {
  ENTRY_RANGES,
  bumpEntryValue,
  entryFieldPatch,
  hasEditableParams,
} from '../../src/ui/screens/journal/entry-edit.js';
import { rateStateFromEntry } from '../../src/ui/screens/journal/rate-store.js';

const entry: EntryRecord = {
  id: 'j1',
  date: '2025-04-01',
  time: '08:30',
  bean: 'b1',
  device: 'v60',
  devName: 'Hario V60-02',
  mode: 'perc',
  grind: 4.6,
  dose: 15,
  water: 250,
  temp: 94,
  total: 175,
  stages: [['bloom', 45, 45]],
  status: 'done',
  diag: { acid: 6, bitter: 4, body: 5, balance: 7 },
  desc: [['blueberry', 3]],
  note: 'ягодно',
};

describe('bumpEntryValue', () => {
  it('зажимает значение диапазоном поля', () => {
    expect(bumpEntryValue(60, 1, ENTRY_RANGES.temp)).toBe(60 + 1);
    expect(bumpEntryValue(100, 1, ENTRY_RANGES.temp)).toBe(100);
    expect(bumpEntryValue(40, -10, ENTRY_RANGES.water)).toBe(40);
  });

  it('округляет до десятых — иначе помол копил бы двоичный хвост', () => {
    expect(bumpEntryValue(4.6, 0.1, ENTRY_RANGES.grind)).toBe(4.7);
  });
});

describe('entryFieldPatch', () => {
  it('патчит одно поле на один шаг', () => {
    expect(entryFieldPatch(entry, 'dose', 1)).toEqual({ dose: 15.5 });
    expect(entryFieldPatch(entry, 'water', -1)).toEqual({ water: 240 });
  });

  it('у записи без помола патча нет', () => {
    expect(entryFieldPatch({ ...entry, grind: null }, 'grind', 1)).toEqual({});
  });

  it('диапазоны записи шире, чем у сетапа: 4–60 г и 40–900 г', () => {
    expect(entryFieldPatch({ ...entry, dose: 4 }, 'dose', -1)).toEqual({ dose: 4 });
    expect(entryFieldPatch({ ...entry, water: 900 }, 'water', 1)).toEqual({ water: 900 });
  });
});

describe('hasEditableParams', () => {
  it('у дегустации параметров нет — только заметка и оценка', () => {
    expect(hasEditableParams(entry)).toBe(true);
    expect(hasEditableParams({ ...entry, mode: 'cup' })).toBe(false);
  });
});

describe('rateStateFromEntry — предзаполнение переоценки', () => {
  it('переносит шкалы, заметку и дескрипторы', () => {
    const state = rateStateFromEntry(entry);
    expect(state.diag).toEqual(entry.diag);
    expect(state.note).toBe('ягодно');
    expect(state.picked).toEqual([['blueberry', 3]]);
    expect(state.sug).toEqual([]);
  });

  it('копирует, а не ссылается на запись', () => {
    const state = rateStateFromEntry(entry);
    state.diag.acid = 0;
    state.picked.push(['honey', 2]);
    expect(entry.diag.acid).toBe(6);
    expect(entry.desc).toHaveLength(1);
  });

  it('имя дегустации берёт из заголовка чашки', () => {
    expect(rateStateFromEntry({ ...entry, mode: 'cup', title: 'кофейня' }).tasteName).toBe(
      'кофейня',
    );
    expect(rateStateFromEntry(entry).tasteName).toBe('');
  });
});
