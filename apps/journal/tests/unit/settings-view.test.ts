import { describe, expect, it } from 'vitest';

import { BrewJournalDB } from '../../src/db/schema.js';
import { deleteGrinder, listGrinders, putGrinder } from '../../src/db/repo/grinders.js';
import { getSetting, putSetting } from '../../src/db/repo/settings.js';
import { STR } from '../../src/data/strings.js';
import {
  DEFAULT_STEP,
  NEW_GRINDER_ZERO,
  STEP_RANGE,
  TRANSFER_IDLE,
  canDelete,
  grinderMeta,
  makeGrinder,
  transferNote,
} from '../../src/ui/screens/settings/settings-view.js';
import { seedDemo, wantsDemo } from '../../src/db/demo-seed.js';

describe('makeGrinder', () => {
  it('собирает свою кофемолку из имени и цены деления', () => {
    const g = makeGrinder('g1', 'Comandante C40', 8.7);

    expect(g).toMatchObject({
      id: 'g1',
      name: 'Comandante C40',
      micronsPerStep: 8.7,
      zeroOffsetMicrons: NEW_GRINDER_ZERO,
    });
    expect(g.scale.unit).toBe('click');
    // Каталожной записи за ней не стоит — это молка с кухни.
    expect(g.datasetId).toBeUndefined();
  });

  it('держит шаг прототипа: ±0.5 в [0.5, 40], дефолт 10', () => {
    expect(STEP_RANGE).toMatchObject({ min: 0.5, max: 40, step: 0.5 });
    expect(DEFAULT_STEP).toBe(10);
  });
});

describe('grinderMeta', () => {
  it('пишет название делений и цену шага', () => {
    const g = makeGrinder('g1', 'C40', 8.7);
    expect(grinderMeta(g, 'ru')).toBe('кликов · 8.7 µm');
    expect(grinderMeta(g, 'en')).toBe('clicks · 8.7 µm');
  });

  it('называет деления по шкале, а не «кликами» для всех', () => {
    const marked = { ...makeGrinder('g2', 'S3', 8.7), scale: { min: 0, max: 40, step: 0.5, unit: 'mark' as const } };
    expect(grinderMeta(marked, 'ru')).toBe('меток · 8.7 µm');
  });
});

describe('canDelete', () => {
  it('запрещает удалять последнюю кофемолку', () => {
    expect(canDelete(0)).toBe(false);
    expect(canDelete(1)).toBe(false);
    expect(canDelete(2)).toBe(true);
  });
});

describe('удаление через репозиторий', () => {
  it('отказывает на последней и уводит выбор конвертера с удалённой', async () => {
    const db = new BrewJournalDB(`settings-view-${String(Date.now())}`);
    try {
      await putGrinder(makeGrinder('g1', 'C40', 8.7), db);

      // Последнюю не отдаём — иначе конвертеру некуда пересчитывать.
      expect(await deleteGrinder('g1', db)).toBe('last');

      await putGrinder(makeGrinder('g2', 'S3', 9.5), db);
      await putSetting('convTo', 'g2', db);

      expect(await deleteGrinder('g2', db)).toBe('ok');
      expect(await listGrinders(db)).toHaveLength(1);
      // Выбор переехал на выжившую, а не повис на несуществующей.
      expect(await getSetting('convTo', db)).toBe('g1');
    } finally {
      await db.delete();
    }
  });
});

describe('подписи обмена базой', () => {
  it('покоящиеся строки показывают свою подсказку', () => {
    expect(transferNote(TRANSFER_IDLE, 'export', 'ru')).toBe(STR.ru.set_export_hint);
    expect(transferNote(TRANSFER_IDLE, 'import', 'en')).toBe(STR.en.set_import_hint);
  });

  it('результат видит только та строка, которая его получила', () => {
    const done = { kind: 'done', op: 'import' } as const;
    expect(transferNote(done, 'import', 'ru')).toBe(STR.ru.set_import_done);
    // Под ЭКСПОРТОМ «база восстановлена» читалось бы как его результат.
    expect(transferNote(done, 'export', 'ru')).toBe(STR.ru.set_export_hint);
  });

  it('различает чужую версию и нечитаемый файл', () => {
    expect(transferNote({ kind: 'failed', op: 'import', code: 'version' }, 'import', 'ru')).toBe(
      STR.ru.set_import_bad,
    );
    expect(transferNote({ kind: 'failed', op: 'import', code: 'zip' }, 'import', 'ru')).toBe(
      STR.ru.set_import_broken,
    );
    expect(transferNote({ kind: 'failed', op: 'import', code: 'shape' }, 'import', 'ru')).toBe(
      STR.ru.set_import_broken,
    );
  });

  it('на время работы обе операции говорят одно и то же', () => {
    expect(transferNote({ kind: 'busy', op: 'export' }, 'export', 'ru')).toBe(STR.ru.set_busy);
    expect(transferNote({ kind: 'busy', op: 'import' }, 'import', 'en')).toBe(STR.en.set_busy);
  });
});

describe('демо-сид', () => {
  it('включается только строкой ?seed=demo', () => {
    expect(wantsDemo('?seed=demo')).toBe(true);
    expect(wantsDemo('?a=1&seed=demo&b=2')).toBe(true);
    expect(wantsDemo('')).toBe(false);
    expect(wantsDemo('?seed=')).toBe(false);
    expect(wantsDemo('?seed=other')).toBe(false);
    expect(wantsDemo('?demo=1')).toBe(false);
  });

  it('идемпотентен: второй прогон не удваивает записи', async () => {
    const db = new BrewJournalDB(`demo-seed-${String(Date.now())}`);
    try {
      expect(await seedDemo(db)).toBe(true);
      const afterFirst = await db.entries.count();
      const beansFirst = await db.beans.count();
      expect(afterFirst).toBeGreaterThan(0);

      await seedDemo(db);
      expect(await db.entries.count()).toBe(afterFirst);
      expect(await db.beans.count()).toBe(beansFirst);
    } finally {
      await db.delete();
    }
  });
});
