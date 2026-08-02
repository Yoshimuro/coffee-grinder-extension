import { describe, expect, it } from 'vitest';

import {
  type CompareSide,
  compareHeading,
  compareRow,
  compareRows,
} from '../../src/ui/screens/journal/compare-rows.js';
import type { BeanRecord, DeviceRecord, EntryRecord } from '../../src/db/schema.js';

const JAVA: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};

const V60: DeviceRecord = {
  id: 'v60',
  name: 'Hario V60-02',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};

function brew(patch: Partial<EntryRecord> = {}): EntryRecord {
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
    desc: [['cocoa', 2]],
    note: 'ровнее, чем пролив',
    ...patch,
  };
}

/** Дегустация «вне журнала»: ни пачки, ни девайса, ни рецепта (`DC:974`). */
function cup(patch: Partial<EntryRecord> = {}): EntryRecord {
  return brew({
    id: 'j-cup',
    bean: null,
    device: null,
    devName: '',
    mode: 'cup',
    grind: null,
    dose: 0,
    water: 0,
    temp: 0,
    total: 0,
    desc: [],
    note: '',
    title: 'Кофейня на углу',
    ...patch,
  });
}

const side = (entry: EntryRecord, bean?: BeanRecord | null): CompareSide => ({
  entry,
  bean: bean ?? (entry.bean === 'java' ? JAVA : null),
  device: entry.device === 'v60' ? V60 : null,
});

describe('compareRow — строковый дифф после нормализации', () => {
  it('считает null и undefined одним и тем же прочерком', () => {
    expect(compareRow('КЛАПАН', null, undefined, 'ru')).toEqual({
      label: 'КЛАПАН',
      a: '—',
      b: '—',
      diff: false,
    });
  });

  it('сравнивает числа как строки', () => {
    expect(compareRow('ПОМОЛ', 4.8, 4.8, 'ru').diff).toBe(false);
    expect(compareRow('ПОМОЛ', 4.8, 4.6, 'ru').diff).toBe(true);
  });

  it('пустая строка — тоже прочерк', () => {
    const row = compareRow('ЗАМЕТКА', '', 'слаще на остывании', 'ru');
    expect(row.a).toBe('—');
    expect(row.diff).toBe(true);
  });

  it('прочерк против значения — отличие', () => {
    expect(compareRow('КЛАПАН', null, '1:20', 'ru').diff).toBe(true);
  });
});

describe('compareRows — пятнадцать строк §9', () => {
  it('держит порядок и состав', () => {
    const rows = compareRows(side(brew()), side(brew({ id: 'j2' })), 'ru');
    expect(rows).toHaveLength(15);
    expect(rows.map((r) => r.label)).toEqual([
      'ЗЕРНО',
      'ДЕВАЙС',
      'РЕЖИМ',
      'ПОМОЛ',
      'ВЕС',
      'ВОДА',
      'ТЕМПЕРАТУРА',
      'ВРЕМЯ',
      'КЛАПАН',
      'КИСЛОТНОСТЬ',
      'ГОРЕЧЬ',
      'ТЕЛО',
      'СЛАДОСТЬ',
      'ДЕСКРИПТОРЫ',
      'ЗАМЕТКА',
    ]);
  });

  it('две одинаковые записи не дают ни одного отличия', () => {
    const rows = compareRows(side(brew()), side(brew({ id: 'j2' })), 'ru');
    expect(rows.filter((r) => r.diff)).toHaveLength(0);
  });

  it('подсвечивает ровно те строки, что разошлись', () => {
    const rows = compareRows(
      side(brew()),
      side(brew({ id: 'j2', grind: 4.6, water: 240, diag: { acid: 6, bitter: 4, body: 6, balance: 7 } })),
      'ru',
    );
    const diff = rows.filter((r) => r.diff).map((r) => r.label);
    expect(diff).toEqual(['ПОМОЛ', 'ВОДА', 'КИСЛОТНОСТЬ', 'СЛАДОСТЬ']);
  });

  it('форматирует единицы и время', () => {
    const rows = compareRows(side(brew()), side(brew({ id: 'j2' })), 'ru');
    const by = (label: string) => rows.find((r) => r.label === label);
    expect(by('ВЕС')?.a).toBe('15 г');
    expect(by('ВОДА')?.a).toBe('250 г');
    expect(by('ТЕМПЕРАТУРА')?.a).toBe('94°');
    expect(by('ВРЕМЯ')?.a).toBe('2:50');
    expect(by('ДЕВАЙС')?.a).toBe('Hario V60-02');
  });

  it('перечисляет дескрипторы именами через запятую', () => {
    const rows = compareRows(
      side(brew({ desc: [['blueberry', 2], ['honey', 1]] })),
      side(brew({ id: 'j2', desc: [] })),
      'ru',
    );
    const row = rows.find((r) => r.label === 'ДЕСКРИПТОРЫ');
    expect(row?.a).toBe('Черника, Мёд');
    expect(row?.b).toBe('—');
    expect(row?.diff).toBe(true);
  });

  it('молчит про диагностику записи, которая ждёт оценки', () => {
    const rows = compareRows(
      side(brew({ status: 'pending', diag: { acid: 0, bitter: 0, body: 0, balance: 0 } })),
      side(brew({ id: 'j2' })),
      'ru',
    );
    expect(rows.find((r) => r.label === 'КИСЛОТНОСТЬ')?.a).toBe('—');
    expect(rows.find((r) => r.label === 'КИСЛОТНОСТЬ')?.b).toBe('5');
  });
});

/*
 * Ради этого блока файл и существует: прототип падал на паре, где хоть одна
 * запись — дегустация (`DC:1174`, §9), а выбрать её в сравнение можно всегда.
 */
describe('compareRows — записи-дегустации', () => {
  it('не падает, когда пачки нет, и ставит прочерк', () => {
    const rows = compareRows(side(cup()), side(brew()), 'ru');
    expect(rows).toHaveLength(15);
    expect(rows[0]?.label).toBe('ЗЕРНО');
    expect(rows[0]?.a).toBe('—');
    expect(rows[0]?.b).toBe('Ява Золотая');
    expect(rows[0]?.diff).toBe(true);
  });

  it('не падает на паре из двух дегустаций', () => {
    const rows = compareRows(side(cup()), side(cup({ id: 'j-cup2' })), 'ru');
    expect(rows.filter((r) => r.diff)).toHaveLength(0);
  });

  it('показывает рецепт дегустации прочерками, а не нулями', () => {
    const rows = compareRows(side(cup()), side(cup({ id: 'j-cup2' })), 'ru');
    const by = (label: string) => rows.find((r) => r.label === label)?.a;
    expect(by('ВЕС')).toBe('—');
    expect(by('ВОДА')).toBe('—');
    expect(by('ТЕМПЕРАТУРА')).toBe('—');
    expect(by('ВРЕМЯ')).toBe('—');
    expect(by('ПОМОЛ')).toBe('—');
  });

  it('режим у дегустации всё-таки называется', () => {
    const rows = compareRows(side(cup()), side(brew()), 'ru');
    expect(rows.find((r) => r.label === 'РЕЖИМ')?.a).toBe('Дегустация');
  });

  it('девайса у дегустации нет', () => {
    const rows = compareRows(side(cup()), side(brew()), 'ru');
    expect(rows.find((r) => r.label === 'ДЕВАЙС')?.a).toBe('—');
  });
});

describe('compareHeading', () => {
  it('дописывает помол, когда он есть', () => {
    expect(compareHeading('a', brew(), 'ru')).toBe('A · 31.07 · 4.8');
  });

  it('без помола ограничивается датой', () => {
    expect(compareHeading('b', cup(), 'ru')).toBe('B · 31.07');
  });
});
