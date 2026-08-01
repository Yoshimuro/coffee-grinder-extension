import { describe, expect, it } from 'vitest';

import { demoDevices, demoJournal, demoSeeds, demoShelf, isDevBuild } from '../../src/data/seeds.js';
import { descById } from '../../src/data/wheel.js';
import { STAGE_KEYS } from '../../src/domain/stages.js';

describe('демо-сиды', () => {
  it('дают три пачки — по одной на каждую форму кофе', () => {
    const shelf = demoShelf();
    expect(shelf.map((b) => b.id)).toEqual(['java', 'drip1', 'kenya']);
    expect(shelf.map((b) => b.form)).toEqual(['beans', 'drip', 'ground']);
    // BJ-2 D-3: photos — массив, а не счётчик прототипа.
    for (const b of shelf) expect(Array.isArray(b.photos)).toBe(true);
  });

  it('своих девайсов у демо-пользователя нет', () => {
    expect(demoDevices()).toEqual([]);
  });

  it('дают шесть записей журнала, одна из которых ждёт оценки', () => {
    const journal = demoJournal();
    expect(journal).toHaveLength(6);
    expect(journal.filter((e) => e.status === 'pending').map((e) => e.id)).toEqual(['j1']);
  });

  it('ссылаются только на существующие дескрипторы, стадии и пачки', () => {
    const beans = new Set(demoShelf().map((b) => b.id));
    for (const e of demoJournal()) {
      expect(beans.has(e.bean ?? '')).toBe(true);
      for (const [id] of e.desc) expect(descById(id), id).toBeDefined();
      for (const [key] of e.stages) expect(STAGE_KEYS).toContain(key);
    }
  });

  it('возвращают свежие объекты — сид нельзя испортить мутацией', () => {
    expect(demoShelf()).not.toBe(demoShelf());
    expect(demoJournal()[0]).not.toBe(demoJournal()[0]);
  });

  it('demoSeeds отдаёт набор только в dev-сборке', () => {
    const seeds = demoSeeds();
    if (isDevBuild()) {
      expect(seeds?.beans).toHaveLength(3);
      expect(seeds?.entries).toHaveLength(6);
    } else {
      expect(seeds).toBeNull();
    }
  });
});
