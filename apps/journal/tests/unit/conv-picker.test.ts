import { allGrinders, groupByBrand } from '@coffee/core';
import { describe, expect, it } from 'vitest';

import {
  RECENTS_SHOWN,
  hasQuery,
  pickerRows,
  recentGrinders,
  toggleBrand,
} from '../../src/ui/screens/conv/picker.js';

const BASE = {
  recents: [] as string[],
  selected: null as string | null,
  expanded: new Set<string>(),
  recentLabel: 'НЕДАВНИЕ',
  emptyLabel: 'ничего не найдено',
};

const ids = (rows: ReturnType<typeof pickerRows>) =>
  rows.filter((r) => r.kind === 'grinder').map((r) => (r.kind === 'grinder' ? r.grinder.id : ''));

describe('hasQuery', () => {
  it('пробелы запросом не считаются', () => {
    expect(hasQuery('')).toBe(false);
    expect(hasQuery('   ')).toBe(false);
    expect(hasQuery(' c40 ')).toBe(true);
  });
});

describe('pickerRows — пустой запрос', () => {
  it('показывает по строке на бренд и ни одной модели', () => {
    const rows = pickerRows({ ...BASE, query: '' });
    const brands = groupByBrand(allGrinders()).length;

    expect(rows.filter((r) => r.kind === 'brand')).toHaveLength(brands);
    expect(rows.filter((r) => r.kind === 'grinder')).toHaveLength(0);
    /* 42 строки вместо 134 — ровно ради этого пикер и написан. */
    expect(brands).toBeLessThan(allGrinders().length);
  });

  it('раскрытый бренд отдаёт свои модели с отступом', () => {
    const rows = pickerRows({ ...BASE, query: '', expanded: new Set(['Comandante']) });
    const models = rows.filter((r) => r.kind === 'grinder');

    expect(models.length).toBeGreaterThan(0);
    for (const row of models) {
      expect(row.kind === 'grinder' && row.grinder.brand).toBe('Comandante');
      expect(row.kind === 'grinder' && row.indent).toBe(true);
    }
  });

  it('недавние идут секцией сверху', () => {
    const rows = pickerRows({
      ...BASE,
      query: '',
      recents: ['comandante-c40-mk4', '1zpresso-jx-pro'],
    });

    expect(rows[0]).toMatchObject({ kind: 'label', text: 'НЕДАВНИЕ' });
    expect(ids(rows)).toEqual(['comandante-c40-mk4', '1zpresso-jx-pro']);
  });

  it('без недавних заголовка секции нет', () => {
    const rows = pickerRows({ ...BASE, query: '' });
    expect(rows.some((r) => r.kind === 'label')).toBe(false);
  });

  it('выбранная строка помечена', () => {
    const rows = pickerRows({
      ...BASE,
      query: '',
      expanded: new Set(['Comandante']),
      selected: 'comandante-c40-mk4',
    });
    const picked = rows.find((r) => r.kind === 'grinder' && r.selected);
    expect(picked?.kind === 'grinder' && picked.grinder.id).toBe('comandante-c40-mk4');
  });
});

describe('pickerRows — поиск', () => {
  it('плоский список без брендов и недавних', () => {
    const rows = pickerRows({ ...BASE, query: 'comandante', recents: ['1zpresso-jx-pro'] });

    expect(rows.every((r) => r.kind === 'grinder')).toBe(true);
    expect(rows.every((r) => r.kind === 'grinder' && !r.indent)).toBe(true);
  });

  it('все термы через пробел должны совпасть', () => {
    const found = ids(pickerRows({ ...BASE, query: '1z jx' }));
    expect(found.length).toBeGreaterThan(0);
    for (const id of found) expect(id).toContain('1zpresso');
    expect(found.some((id) => id.includes('jx'))).toBe(true);
  });

  it('ищет по алиасам, а не только по модели', () => {
    const byModel = ids(pickerRows({ ...BASE, query: 'jx-pro' }));
    expect(byModel).toContain('1zpresso-jx-pro');
  });

  it('регистр не важен', () => {
    expect(ids(pickerRows({ ...BASE, query: 'COMANDANTE' }))).toEqual(
      ids(pickerRows({ ...BASE, query: 'comandante' })),
    );
  });

  it('мимо — одна строка «ничего не найдено»', () => {
    const rows = pickerRows({ ...BASE, query: 'кофемолка которой нет' });
    expect(rows).toEqual([
      { kind: 'empty', key: 'empty', text: 'ничего не найдено' },
    ]);
  });
});

describe('recentGrinders', () => {
  it('не длиннее трёх', () => {
    const many = allGrinders().slice(0, 6).map((g) => g.id);
    expect(recentGrinders(many, null)).toHaveLength(RECENTS_SHOWN);
  });

  it('выбрасывает текущий выбор — ссылка на себя ничего не даёт', () => {
    const got = recentGrinders(['comandante-c40-mk4', '1zpresso-jx-pro'], 'comandante-c40-mk4');
    expect(got.map((g) => g.id)).toEqual(['1zpresso-jx-pro']);
  });

  it('молчит про id, которых в каталоге больше нет', () => {
    expect(recentGrinders(['снят-с-производства', 'comandante-c40-mk4'], null).map((g) => g.id)).toEqual([
      'comandante-c40-mk4',
    ]);
  });

  it('дубли схлопывает', () => {
    const got = recentGrinders(['comandante-c40-mk4', 'comandante-c40-mk4'], null);
    expect(got).toHaveLength(1);
  });

  it('порядок истории сохраняется', () => {
    const order = ['1zpresso-jx-pro', 'comandante-c40-mk4'];
    expect(recentGrinders(order, null).map((g) => g.id)).toEqual(order);
  });
});

describe('toggleBrand', () => {
  it('переключает и не мутирует вход', () => {
    const start: ReadonlySet<string> = new Set(['Comandante']);
    const opened = toggleBrand(start, '1Zpresso');
    expect([...opened].sort()).toEqual(['1Zpresso', 'Comandante']);

    const closed = toggleBrand(opened, 'Comandante');
    expect([...closed]).toEqual(['1Zpresso']);
    expect([...start]).toEqual(['Comandante']);
  });
});
