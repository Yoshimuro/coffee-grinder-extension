import { describe, expect, it } from 'vitest';

import type { BeanRecord, DeviceRecord, EntryRecord } from '../../src/db/schema.js';
import { deviceLabel, entryMark, entrySub, entryTitle } from '../../src/ui/entry-format.js';

const BEAN: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};

const DEVICE: DeviceRecord = {
  id: 'v60',
  name: 'Hario V60-02',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};

function entry(patch: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'j1',
    date: '2026-08-01',
    time: '09:12',
    bean: 'java',
    device: 'v60',
    devName: 'V60',
    mode: 'perc',
    grind: 4.4,
    dose: 15,
    water: 250,
    temp: 94,
    total: 168,
    stages: [],
    status: 'done',
    diag: { acid: 5, bitter: 4, body: 6, balance: 6 },
    desc: [],
    note: '',
    ...patch,
  };
}

describe('entryTitle', () => {
  it('склеивает пачку и девайс', () => {
    expect(entryTitle(entry(), 'ru', { bean: BEAN, device: DEVICE })).toBe('Ява Золотая · V60');
  });

  it('ставит прочерк на месте удалённой пачки', () => {
    expect(entryTitle(entry(), 'ru', { device: DEVICE })).toBe('— · V60');
  });

  it('для дрипа вместо девайса — форма кофе', () => {
    const e = entry({ mode: 'drip', device: null, devName: '' });
    expect(entryTitle(e, 'ru', { bean: { ...BEAN, name: 'Дрип · Колумбия Уила' } })).toBe(
      'Дрип · Колумбия Уила · ДРИП-ПАКЕТ',
    );
    expect(entryTitle(e, 'en', { bean: BEAN })).toBe('Ява Золотая · DRIP BAG');
  });

  it('дегустация берёт своё имя, иначе — «Чашка»', () => {
    expect(entryTitle(entry({ mode: 'cup', title: 'кофейня, зерно' }), 'ru')).toBe(
      'кофейня, зерно',
    );
    expect(entryTitle(entry({ mode: 'cup' }), 'ru')).toBe('Чашка');
    expect(entryTitle(entry({ mode: 'cup' }), 'en')).toBe('Cup');
  });
});

describe('deviceLabel', () => {
  it('предпочитает денормализованное имя — запись переживает удаление девайса', () => {
    expect(deviceLabel(entry({ devName: 'Switch' }), 'ru', undefined)).toBe('Switch');
  });

  it('срезает бренд Hario, когда имя берётся из девайса', () => {
    expect(deviceLabel(entry({ devName: '' }), 'ru', DEVICE)).toBe('V60-02');
  });

  it('без имени и без девайса — прочерк', () => {
    expect(deviceLabel(entry({ devName: '' }), 'ru', null)).toBe('—');
  });
});

describe('entrySub', () => {
  it('собирает тех-строку в порядке прототипа', () => {
    expect(entrySub(entry(), 'ru')).toBe('помол 4.4 · 15 г · 250 г · 94° · 2:48');
    expect(entrySub(entry(), 'en')).toBe('grind 4.4 · 15 g · 250 g · 94° · 2:48');
  });

  it('без помола, когда его задал производитель', () => {
    expect(entrySub(entry({ grind: null, mode: 'drip' }), 'ru')).toBe('15 г · 250 г · 94° · 2:48');
  });

  it('у дегустации своя строка', () => {
    expect(entrySub(entry({ mode: 'cup' }), 'ru')).toBe('дегустация · без рецепта');
    expect(entrySub(entry({ mode: 'cup' }), 'en')).toBe('tasting · no recipe');
  });
});

describe('entryMark', () => {
  it('показывает сладость из диагностики', () => {
    expect(entryMark(entry(), 'ru')).toBe('С 6');
    expect(entryMark(entry(), 'en')).toBe('S 6');
  });

  it('молчит, пока запись ждёт оценки', () => {
    expect(entryMark(entry({ status: 'pending' }), 'ru')).toBe('');
  });

  it('не прячет честный ноль у оценённой записи', () => {
    expect(entryMark(entry({ diag: { acid: 0, bitter: 0, body: 0, balance: 0 } }), 'ru')).toBe(
      'С 0',
    );
  });
});
