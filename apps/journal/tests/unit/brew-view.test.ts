import { describe, expect, it } from 'vitest';

import type { BeanRecord, DeviceRecord, EntryRecord, GrinderRecord } from '../../src/db/schema.js';
import {
  BREW_DEFAULTS,
  type BrewSetupValues,
  setupFromEntry,
} from '../../src/ui/screens/brewing/brew-store.js';
import {
  DOSE_RANGE,
  GRIND_RANGE,
  POURS_RANGE,
  TEMP_RANGE,
  VALVE_RANGE,
  WATER_RANGE,
  beanTech,
  brewPlan,
  brewSetup,
  effectiveDose,
  formLabel,
  grindHint,
  grindSpan,
  isHybrid,
  leftLabel,
  ratioLine,
  showDevice,
  showDose,
  showGrind,
  showPours,
  showValve,
} from '../../src/ui/screens/brewing/brew-view.js';

/* ── Фикстуры ────────────────────────────────────────────────────────────── */

const TODAY = '2026-08-01';

const beans: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};

const ground: BeanRecord = { ...beans, id: 'kenya', form: 'ground', left: 64 };

const drip: BeanRecord = {
  id: 'drip1',
  form: 'drip',
  name: 'Дрип · Колумбия',
  roast: '2026-07-10',
  photos: [],
  count: 5,
  leftCount: 3,
  dose: 12,
};

const v60: DeviceRecord = {
  id: 'v60',
  name: 'Hario V60-02',
  flow: 'perc',
  bottom: 'cone',
  wall: 'spiral',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
};

const aero: DeviceRecord = { ...v60, id: 'aero', name: 'AeroPress', flow: 'imm', bottom: 'cyl' };
const sw: DeviceRecord = { ...v60, id: 'switch', name: 'Hario Switch', flow: 'hybrid' };

const s3: GrinderRecord = {
  id: 's3',
  name: 'Timemore Chestnut S3',
  micronsPerStep: 8.7,
  zeroOffsetMicrons: 690,
  scale: { min: 0, max: 36, step: 0.1, unit: 'click' },
};

const values: BrewSetupValues = { ...BREW_DEFAULTS, bean: 'java', device: 'v60' };

/* ── Диапазоны ───────────────────────────────────────────────────────────── */

describe('диапазоны полей — таблица component-report §10.11', () => {
  it('перенесены дословно', () => {
    expect(GRIND_RANGE).toEqual({ min: 0, max: 36, step: 0.1 });
    expect(DOSE_RANGE).toEqual({ min: 8, max: 40, step: 0.5 });
    expect(WATER_RANGE).toEqual({ min: 80, max: 900, step: 10 });
    expect(TEMP_RANGE).toEqual({ min: 70, max: 100, step: 1 });
    expect(POURS_RANGE).toEqual({ min: 1, max: 6, step: 1 });
    expect(VALVE_RANGE).toEqual({ min: 20, max: 600, step: 10 });
  });
});

/* ── Что показывать ──────────────────────────────────────────────────────── */

describe('видимость полей', () => {
  it('дрип не выбирает девайс и не настраивает дозу', () => {
    expect(showDevice('drip')).toBe(false);
    expect(showDose('drip')).toBe(false);
    expect(showDevice('beans')).toBe(true);
    expect(showDose('ground')).toBe(true);
  });

  it('помол настраивается только у зерна', () => {
    expect(showGrind('beans')).toBe(true);
    expect(showGrind('ground')).toBe(false);
    expect(showGrind('drip')).toBe(false);
  });

  it('клапан — только у гибрида и только в режиме «СЕРЕДИНА»', () => {
    expect(isHybrid('beans', sw)).toBe(true);
    expect(isHybrid('beans', v60)).toBe(false);
    // Дрип уводит в свою ветку раньше, чем смотрят на девайс.
    expect(isHybrid('drip', sw)).toBe(false);

    expect(showValve('beans', sw, 'mid')).toBe(true);
    expect(showValve('beans', sw, 'imm')).toBe(false);
    expect(showValve('beans', v60, 'mid')).toBe(false);
  });

  it('проливы — у дрипа, перколяции и гибрида в режиме пролива', () => {
    expect(showPours('drip', null, 'imm')).toBe(true);
    expect(showPours('beans', v60, 'imm')).toBe(true);
    expect(showPours('beans', aero, 'imm')).toBe(false);
    expect(showPours('beans', sw, 'perc')).toBe(true);
    expect(showPours('beans', sw, 'imm')).toBe(false);
    expect(showPours('beans', sw, 'mid')).toBe(false);
    // Девайс не выбран: расчёт считает проливом, но поле не показывается —
    // так же, как в прототипе (`DC:1299` требует непустой `brewDev`).
    expect(showPours('beans', null, 'imm')).toBe(false);
  });
});

/* ── Строки ──────────────────────────────────────────────────────────────── */

describe('строки сетапа', () => {
  it('метка формы кофе', () => {
    expect(formLabel('beans', 'ru')).toBe('ЗЕРНО');
    expect(formLabel('ground', 'ru')).toBe('МОЛОТЫЙ');
    expect(formLabel('drip', 'ru')).toBe('ДРИП-ПАКЕТ');
    expect(formLabel('drip', 'en')).toBe('DRIP BAG');
  });

  it('остаток: граммы у зерна, штуки у дрипа', () => {
    expect(leftLabel(beans, 'ru')).toBe('187 г');
    expect(leftLabel(drip, 'ru')).toBe('3 шт');
    expect(leftLabel(drip, 'en')).toBe('3 pcs');
    // Пачка без остатка не должна давать «undefined г».
    const noLeft: BeanRecord = { id: 'x', form: 'beans', roast: '2026-07-27', photos: [] };
    expect(leftLabel(noLeft, 'ru')).toBe('0 г');
  });

  it('тех-подстрока пачки: возраст, фаза, остаток', () => {
    expect(beanTech(beans, 'ru', TODAY)).toBe('5 дн · пик · 187 г');
    expect(beanTech(drip, 'ru', TODAY)).toBe('22 дн · спад · 3 шт');
    expect(beanTech({ ...beans, roast: '2026-07-30' }, 'ru', TODAY)).toBe('2 дн · дегазация · 187 г');
  });

  it('соотношение считается по дозе, а не по полю сетапа', () => {
    expect(ratioLine(250, 15, 'ru')).toBe('1:16.7');
    expect(ratioLine(240, 12, 'ru')).toBe('1:20.0');
    // Дрип без дозы: делить не на что — прочерк вместо «1:Infinity».
    expect(ratioLine(250, 0, 'ru')).toBe('—');
  });

  it('доза дрипа берётся из пачки, а не из степпера', () => {
    expect(effectiveDose(drip, 15)).toBe(12);
    expect(effectiveDose(beans, 15)).toBe(15);
    expect(effectiveDose(null, 15)).toBe(15);
    // Дрип без дозы производителя: ноль, а не NaN в расчёте смачивания.
    const noDose: BeanRecord = { id: 'y', form: 'drip', roast: '2026-07-10', photos: [] };
    expect(effectiveDose(noDose, 15)).toBe(0);
  });
});

describe('подсказка помола', () => {
  it('форматирует диапазон и центр', () => {
    expect(grindHint({ lo: 3.2, center: 4.6, hi: 6 }, 'ru')).toBe(
      'конвертер: 3.2 — 6.0 · центр 4.6',
    );
    expect(grindHint({ lo: 3.2, center: 4.6, hi: 6 }, 'en')).toBe(
      'converter: 3.2 — 6.0 · center 4.6',
    );
  });

  it('без кофемолки и без ответа конвертера подсказки нет', () => {
    expect(grindSpan(undefined, 4.6, null)).toBeNull();
    expect(grindHint(null, 'ru')).toBeUndefined();
  });

  it('ответ конвертера побеждает расчёт по своей кофемолке', () => {
    const span = { lo: 1, center: 2, hi: 3 };
    expect(grindSpan(s3, 4.6, span)).toBe(span);
  });

  it('без ответа конвертера считает полосу вокруг текущей настройки', () => {
    const span = grindSpan(s3, 4.6, null);
    expect(span).not.toBeNull();
    // Центр — сама настройка, полоса её обнимает: это неопределённость шкалы,
    // а не сдвиг ответа.
    expect(span?.center).toBeCloseTo(4.6, 5);
    expect(span?.lo).toBeLessThanOrEqual(4.6);
    expect(span?.hi).toBeGreaterThanOrEqual(4.6);
  });
});

/* ── Сборка плана ────────────────────────────────────────────────────────── */

describe('сборка плана заваривания', () => {
  it('зерно: девайс и помол уходят в план целиком', () => {
    expect(brewPlan(values, beans, v60)).toEqual({
      form: 'beans',
      device: v60,
      hyMode: 'imm',
      dose: 15,
      water: 250,
      pours: 3,
      valveAt: 80,
    });
    expect(brewSetup(values, beans, v60).grind).toBe(4.6);
    expect(brewSetup(values, beans, v60).temp).toBe(94);
  });

  it('молотый: помол в запись не идёт — его задал производитель', () => {
    expect(brewSetup(values, ground, v60).grind).toBeNull();
  });

  it('дрип: девайс отбрасывается, доза приходит из пачки', () => {
    const plan = brewPlan(values, drip, v60);
    expect(plan.device).toBeNull();
    expect(plan.dose).toBe(12);
    expect(brewSetup(values, drip, v60).grind).toBeNull();
  });
});

/* ── «ПОВТОРИТЬ» ─────────────────────────────────────────────────────────── */

describe('setupFromEntry — запись обратно в сетап', () => {
  const entry: EntryRecord = {
    id: 'j1',
    date: '2026-08-01',
    time: '09:12',
    bean: 'java',
    device: 'v60',
    devName: 'V60',
    mode: 'perc',
    grind: 4.4,
    dose: 16,
    water: 260,
    temp: 92,
    total: 168,
    stages: [],
    pours: 2,
    status: 'done',
    diag: { acid: 5, bitter: 5, body: 5, balance: 6 },
    desc: [],
    note: '',
  };

  it('переносит параметры и сбрасывает диапазон конвертера', () => {
    expect(setupFromEntry(entry)).toEqual({
      bean: 'java',
      device: 'v60',
      grind: 4.4,
      dose: 16,
      water: 260,
      temp: 92,
      pours: 2,
      span: null,
    });
  });

  it('не подставляет помол, которого в записи нет', () => {
    expect(setupFromEntry({ ...entry, grind: null })).not.toHaveProperty('grind');
  });

  it('момент клапана опознаёт режим гибрида', () => {
    const patch = setupFromEntry({ ...entry, mode: 'hybrid', valveAt: 120 });
    expect(patch.valveAt).toBe(120);
    expect(patch.hyMode).toBe('mid');
  });
});
