import { grinderById } from '@coffee/core';
import { afterEach, describe, expect, it } from 'vitest';

import { pushRecent } from '../../src/db/repo/settings.js';
import { BrewJournalDB, getSetting, putSetting } from '../../src/db/schema.js';
import type { EntryRecord, GrinderRecord } from '../../src/db/schema.js';
import { calibrationFrom, suggestCalibration } from '../../src/domain/calibration.js';
import {
  DEFAULT_FROM_ID,
  type ConverterState,
  calibLine,
  convView,
  converterInputs,
  converterSpan,
  cycleOwn,
  dbCountLine,
  defaultSetting,
  rawCenter,
  resolveFrom,
  resolveTo,
  suggestLine,
  unitOf,
} from '../../src/ui/screens/conv/model.js';

/* Своя кофемолка — та, что сидится первым запуском. Числа из каталога. */
const S3: GrinderRecord = {
  id: 'timemore-s3',
  name: 'Timemore Chestnut S3',
  datasetId: 'timemore-s3',
  micronsPerStep: 86.7,
  zeroOffsetMicrons: 330,
  scale: { min: 0, max: 9, step: 0.1, unit: 'mark' },
};

/** Чистое сохранённое состояние: обе стороны по умолчанию, без калибровки. */
const BASE_STATE: ConverterState = {
  calib: { offset: 0, src: null },
  convFrom: null,
  convTo: null,
  convVal: 30,
};

/** Молка, заведённая руками: в каталоге её нет, значит доверие «оценка». */
const HOMEMADE: GrinderRecord = {
  id: 'g1',
  name: 'Своя',
  micronsPerStep: 20,
  zeroOffsetMicrons: 100,
  scale: { min: 0, max: 50, step: 1, unit: 'click' },
};

function c40() {
  const g = grinderById(DEFAULT_FROM_ID);
  if (g === undefined) throw new Error('в каталоге нет стартовой кофемолки');
  return g;
}

describe('resolveFrom', () => {
  it('находит запись каталога по id', () => {
    expect(resolveFrom('1zpresso-jx-pro').model).toBe('JX-Pro');
  });

  it('падает на стартовую, когда id пуст или устарел', () => {
    expect(resolveFrom(null).id).toBe(DEFAULT_FROM_ID);
    expect(resolveFrom('молка-из-другой-жизни').id).toBe(DEFAULT_FROM_ID);
  });

  it('стартовая — та, что на макете', () => {
    expect(resolveFrom(null).brand).toBe('Comandante');
  });
});

describe('defaultSetting', () => {
  it('середина шкалы, снапнутая на засечку', () => {
    expect(defaultSetting({ min: 0, max: 60, step: 1, unit: 'click' })).toBe(30);
    expect(defaultSetting({ min: 0, max: 9, step: 0.1, unit: 'mark' })).toBe(4.5);
  });

  it('шкала, начинающаяся не с нуля, тоже делится пополам', () => {
    expect(defaultSetting({ min: 1, max: 40, step: 1, unit: 'number' })).toBe(21);
  });

  it('никогда не выходит за края', () => {
    const value = defaultSetting({ min: 5, max: 6, step: 2, unit: 'number' });
    expect(value).toBeGreaterThanOrEqual(5);
    expect(value).toBeLessThanOrEqual(6);
  });
});

describe('unitOf', () => {
  it('знает три вида шкал каталога', () => {
    expect(unitOf({ min: 0, max: 1, step: 1, unit: 'click' }, 'ru')).toBe('кликов');
    expect(unitOf({ min: 0, max: 1, step: 1, unit: 'mark' }, 'ru')).toBe('меток');
    expect(unitOf({ min: 0, max: 1, step: 1, unit: 'number' }, 'en')).toBe('numbers');
  });
});

describe('cycleOwn', () => {
  const own = [HOMEMADE, S3, { ...HOMEMADE, id: 'g3' }];

  it('идёт по кругу', () => {
    expect(cycleOwn(own, 'g1')).toBe('timemore-s3');
    expect(cycleOwn(own, 'g3')).toBe('g1');
  });

  it('одна молка — перебирать нечего', () => {
    expect(cycleOwn([S3], 'timemore-s3')).toBe('timemore-s3');
  });

  it('пустой список — null, а не падение', () => {
    expect(cycleOwn([], null)).toBeNull();
  });

  it('неизвестный текущий id начинает с первой', () => {
    expect(cycleOwn(own, 'её удалили')).toBe('g1');
  });
});

describe('resolveTo', () => {
  it('падает на первую свою, когда настройка указывает в никуда', () => {
    expect(resolveTo([S3, HOMEMADE], 'нет такой')?.id).toBe('timemore-s3');
  });

  it('пустой список — undefined', () => {
    expect(resolveTo([], 'g1')).toBeUndefined();
  });
});

describe('convView — что видит пользователь', () => {
  const base = { from: c40(), setting: 30, to: S3, offset: 0, lang: 'ru' as const };

  it('собирает обе тех-строки из ответа ядра', () => {
    const view = convView(base);
    expect(view.fromName).toBe('Comandante C40 MK4 Nitro Blade');
    expect(view.tech).toMatch(/^30 кликов · \d+(\.\d+)? µm$/);
    expect(view.center).toContain('диапазон');
    expect(view.centerBig).toBe(String(view.span.center.toFixed(1)));
    expect(view.center).toContain('разрешение');
    expect(view.center).toContain('мкм/шаг');
    expect(view.unit).toBe('меток');
  });

  it('границы диапазона показаны с десятой — иначе результат прыгает шириной', () => {
    const view = convView(base);
    expect(view.lo).toMatch(/^\d+\.\d$/);
    expect(view.hi).toMatch(/^\d+\.\d$/);
    expect(Number(view.lo)).toBeLessThanOrEqual(view.span.center);
    expect(Number(view.hi)).toBeGreaterThanOrEqual(view.span.center);
  });

  it('английская версия не остаётся русской', () => {
    const view = convView({ ...base, lang: 'en' });
    expect(view.unit).toBe('marks');
    expect(view.tech).toContain('clicks');
    expect(view.center).toContain('range');
  });

  it('полоса пересчитана из того же диапазона', () => {
    const view = convView(base);
    expect(view.band.win).toBe(Math.max(8, Math.ceil(Number(view.hi) * 1.4)));
  });
});

describe('convView — калибровка едет в показанный диапазон', () => {
  const base = { from: c40(), setting: 30, to: S3, offset: 0, lang: 'ru' as const };

  it('сдвигает все три точки на одну и ту же величину', () => {
    const raw = convView(base);
    const shifted = convView({ ...base, offset: 0.4 });

    expect(Number(shifted.lo)).toBeCloseTo(Number(raw.lo) + 0.4, 5);
    expect(Number(shifted.hi)).toBeCloseTo(Number(raw.hi) + 0.4, 5);
    expect(shifted.span.center).toBeCloseTo(raw.span.center + 0.4, 5);
  });

  it('микроны калибровка не трогает — это физика, а не шкала', () => {
    const raw = convView(base);
    const shifted = convView({ ...base, offset: 0.4 });
    expect(shifted.tech).toBe(raw.tech);
  });

  it('засечка полосы читает откалиброванный центр, а не сырой', () => {
    /* Окно считается от `hi`, поэтому со сдвигом оно тоже растёт и процент
       центра может даже упасть; сходиться обязан не он, а сама засечка. */
    const shifted = convView({ ...base, offset: 0.4 });
    expect(shifted.band.center).toBeCloseTo(
      (shifted.span.center / shifted.band.win) * 100,
      5,
    );
  });

  it('отрицательное смещение зажимается нулём, а не уходит в минус', () => {
    const view = convView({ ...base, offset: -99 });
    expect(Number(view.lo)).toBe(0);
    expect(view.span.center).toBe(0);
    expect(view.band.left).toBe(0);
  });
});

describe('convView — предупреждения ядра', () => {
  it('молчит, когда всё в пределах шкалы и обе калибровки надёжны', () => {
    expect(convView({ from: c40(), setting: 30, to: S3, offset: 0, lang: 'ru' }).warnings).toEqual(
      [],
    );
  });

  it('говорит про край шкалы, когда ответ туда не помещается', () => {
    const view = convView({ from: c40(), setting: 60, to: S3, offset: 0, lang: 'ru' });
    expect(view.warnings.map((w) => w.key)).toContain('clamped');
  });

  it('говорит про оценочную калибровку своей молки', () => {
    const view = convView({ from: c40(), setting: 30, to: HOMEMADE, offset: 0, lang: 'ru' });
    expect(view.warnings.map((w) => w.key)).toContain('estimated');
  });
});

describe('калибровка — от подсказки до применённого смещения', () => {
  function entry(patch: Partial<EntryRecord>): EntryRecord {
    return {
      id: 'j1',
      date: '2026-08-01',
      time: '09:12',
      bean: 'java',
      device: null,
      devName: '—',
      mode: 'imm',
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

  it('подсказка берёт самую сладкую оценённую заварку', () => {
    const best = suggestCalibration([
      entry({ id: 'a', grind: 4.4, diag: { acid: 5, bitter: 4, body: 6, balance: 6 } }),
      entry({ id: 'b', grind: 5.1, diag: { acid: 5, bitter: 4, body: 6, balance: 9 } }),
      entry({ id: 'c', grind: 3.0, status: 'pending', diag: { acid: 0, bitter: 0, body: 0, balance: 10 } }),
    ]);

    expect(best?.id).toBe('b');
    expect(suggestLine(best, 'ru')).toBe('из журнала: баланс 9/10 при 5.1');
    expect(suggestLine(best, 'en')).toBe('from log: balance 9/10 at 5.1');
  });

  it('без оценённых заварок подсказки нет', () => {
    expect(suggestLine(undefined, 'ru')).toBe('');
  });

  it('ПРИМЕНИТЬ считает смещение от некалиброванного центра', () => {
    const from = c40();
    const centre = rawCenter(from, 30, S3);
    const good = Number((centre + 0.4).toFixed(1));

    const calib = calibrationFrom(good, centre, undefined);
    expect(calib.offset).toBeCloseTo(0.4, 5);
    expect(calib.src).toBeNull();

    /* И этот же офсет, положенный в настройки, двигает показанный диапазон. */
    const view = convView({ from, setting: 30, to: S3, offset: calib.offset, lang: 'ru' });
    expect(view.span.center).toBeCloseTo(good, 5);
  });

  it('смещение, совпавшее с помолом лучшей заварки, помечается журналом', () => {
    const from = c40();
    const centre = rawCenter(from, 30, S3);
    const best = entry({ id: 'b', grind: centre + 0.3 });

    const calib = calibrationFrom(centre + 0.3, centre, best);
    expect(calib.src).toBe('b');
    expect(calibLine(calib.offset, calib.src, 'ru')).toContain('из журнала');
  });

  it('строка индикации проставляет знак и источник', () => {
    expect(calibLine(0.4, null, 'ru')).toBe('калибровано +0.4 · вручную');
    expect(calibLine(-0.4, 'j1', 'en')).toBe('calibrated -0.4 · from log');
  });
});

describe('счётчик базы', () => {
  it('считает записи каталога, а не свои молки', () => {
    expect(dbCountLine('ru')).toMatch(/^\d+ кофемолки · база$/);
    expect(dbCountLine('en')).toMatch(/^\d+ grinders · base$/);
  });
});

/* ── Персист выбора ──────────────────────────────────────────────────────── */

let open: BrewJournalDB[] = [];

function freshDb(): BrewJournalDB {
  const database = new BrewJournalDB(`brew-journal-conv-${crypto.randomUUID()}`);
  open.push(database);
  return database;
}

afterEach(async () => {
  for (const database of open) database.close();
  for (const database of open) await database.delete();
  open = [];
});

describe('конвертер помнит выбор', () => {
  it('пикер дописывает молку в недавние, свежая первой', async () => {
    const db = freshDb();

    await pushRecent('comandante-c40-mk4', db);
    await pushRecent('1zpresso-jx-pro', db);
    await pushRecent('comandante-c40-mk4', db);

    expect(await getSetting('recents', db)).toEqual([
      'comandante-c40-mk4',
      '1zpresso-jx-pro',
    ]);
  });

  it('недавних не больше трёх', async () => {
    const db = freshDb();
    for (const id of ['a', 'b', 'c', 'd']) await pushRecent(id, db);
    expect(await getSetting('recents', db)).toEqual(['d', 'c', 'b']);
  });

  it('обе стороны переживают перезаход', async () => {
    const db = freshDb();

    await putSetting('convFrom', '1zpresso-jx-pro', db);
    await putSetting('convTo', 'timemore-s3', db);

    expect(resolveFrom((await getSetting('convFrom', db)) ?? null).id).toBe('1zpresso-jx-pro');
    expect(resolveTo([S3], (await getSetting('convTo', db)) ?? null)?.id).toBe('timemore-s3');
  });

  /* D-9: настройка «ОТКУДА» тоже стала ключом настроек — иначе после перезахода
     конвертер показывал бы середину шкалы вместо того, что человек выставил. */
  it('настройка «ОТКУДА» переживает перезаход', async () => {
    const db = freshDb();
    await putSetting('convVal', 22, db);

    const state: ConverterState = {
      ...BASE_STATE,
      convVal: (await getSetting('convVal', db)) ?? 0,
    };
    expect(converterInputs([S3], state).setting).toBe(22);
  });
});

describe('состояние конвертера — один источник на два экрана', () => {
  it('разрешает сохранённые id в записи каталога и своей полки', () => {
    const inputs = converterInputs([S3, HOMEMADE], {
      ...BASE_STATE,
      convFrom: '1zpresso-jx-pro',
      convTo: 'g1',
    });

    expect(inputs.from.id).toBe('1zpresso-jx-pro');
    expect(inputs.to?.id).toBe('g1');
  });

  it('зажимает настройку, оставшуюся от кофемолки с другой шкалой', () => {
    // 30 кликов Comandante на шкале 0–9 — это максимум, а не «нет значения».
    const inputs = converterInputs([S3], { ...BASE_STATE, convFrom: 'timemore-s3', convVal: 30 });
    expect(inputs.setting).toBe(inputs.from.scale.max);

    const broken = converterInputs([S3], { ...BASE_STATE, convVal: Number.NaN });
    expect(broken.setting).toBe(defaultSetting(broken.from.scale));
  });

  it('без своих кофемолок пересчитывать не во что', () => {
    expect(converterSpan([], BASE_STATE)).toBeNull();
    expect(converterInputs([], BASE_STATE).to).toBeUndefined();
  });

  /* Экран собирает `convView` из тех же входов, поэтому диапазон под помолом в
     сетапе заваривания обязан совпадать с тем, что нарисовано на конвертере. */
  it('даёт тот же диапазон, что показывает сам конвертер', () => {
    const state: ConverterState = { ...BASE_STATE, calib: { offset: 1.2, src: null } };
    const { from, setting, to } = converterInputs([S3], state);
    expect(to).toBeDefined();
    if (to === undefined) return;

    const view = convView({ from, setting, to, offset: state.calib.offset, lang: 'ru' });
    expect(converterSpan([S3], state)).toEqual(view.span);
  });

  it('везёт калибровку с собой', () => {
    const plain = converterSpan([S3], BASE_STATE);
    const shifted = converterSpan([S3], { ...BASE_STATE, calib: { offset: -0.5, src: null } });

    expect(plain).not.toBeNull();
    expect(shifted?.center).toBeCloseTo((plain?.center ?? 0) - 0.5, 5);
    expect(shifted?.hi).toBeCloseTo((plain?.hi ?? 0) - 0.5, 5);
  });
});
