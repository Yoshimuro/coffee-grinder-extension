import { describe, expect, it } from 'vitest';

import type { Stage } from '../../src/db/schema.js';
import {
  RECIPE_DUR_STEP,
  RECIPE_WATER_STEP,
  addPour,
  bumpStageDuration,
  bumpStageWater,
  isEditableStage,
  recipeRows,
  recipeTotalLine,
  recipeValveAt,
  recipeWaterNote,
  removeStage,
  stageTakesWater,
} from '../../src/ui/screens/brewing/recipe.js';

/* Перколяция на два пролива — то же, что отдаёт `stagesFor` на 250 г. */
const perc: Stage[] = [
  ['bloom', 45, 45],
  ['pour', 40, 105],
  ['pour', 40, 100],
  ['drain', 50, 0],
];

/* Иммерсия в аэропрессе: вся вода в первой стадии, между ними — маркер. */
const imm: Stage[] = [
  ['steep', 120, 250],
  ['stir', 0, 0],
  ['press', 30, 0],
];

/* Гибрид «СЕРЕДИНА»: клапан открывается на 80-й секунде настаивания. */
const hyMid: Stage[] = [
  ['steep', 80, 250],
  ['valve', 0, 0],
  ['drain', 90, 0],
];

describe('что видно в редакторе', () => {
  it('в воду льют только смачивание, пролив и настаивание', () => {
    expect(stageTakesWater('bloom')).toBe(true);
    expect(stageTakesWater('pour')).toBe(true);
    expect(stageTakesWater('steep')).toBe(true);
    expect(stageTakesWater('drain')).toBe(false);
    expect(stageTakesWater('press')).toBe(false);
  });

  it('дренаж скрыт всегда, отметка нулевой длительности — тоже', () => {
    expect(isEditableStage(['drain', 50, 0])).toBe(false);
    expect(isEditableStage(['stir', 0, 0])).toBe(false);
    expect(isEditableStage(['valve', 0, 0])).toBe(false);
    expect(isEditableStage(['press', 30, 0])).toBe(true);
    // Водяная стадия остаётся видимой даже на нуле секунд: воду в ней правят.
    expect(isEditableStage(['pour', 0, 50])).toBe(true);
  });
});

describe('recipeRows', () => {
  it('каждая строка названа своей стадией', () => {
    expect(recipeRows(perc, 'ru').map((r) => r.name)).toEqual([
      'смачивание',
      'пролив',
      'пролив',
    ]);
    expect(recipeRows(perc, 'en').map((r) => r.name)).toEqual(['bloom', 'pour', 'pour']);
  });

  /* Между проливами дрипа стоит настаивание, и звать его проливом нельзя: те же
     имена человек читает на таймере, и расходиться им не с чем. */
  it('настаивание между проливами остаётся настаиванием', () => {
    const drip: Stage[] = [
      ['pour', 30, 85],
      ['steep', 30, 0],
      ['pour', 30, 85],
      ['steep', 30, 0],
      ['pour', 30, 80],
      ['drain', 30, 0],
    ];
    expect(recipeRows(drip, 'ru').map((r) => r.name)).toEqual([
      'пролив',
      'настаивание',
      'пролив',
      'настаивание',
      'пролив',
    ]);
  });

  it('иммерсия: настаивание и продавливание — под своими именами', () => {
    expect(recipeRows(imm, 'ru').map((r) => r.name)).toEqual(['настаивание', 'продавить']);
  });

  it('индекс — позиция в полном плане, а не в списке строк', () => {
    // Маркер `stir` спрятан, но нумерацию стадий не сдвигает.
    expect(recipeRows(imm, 'ru').map((r) => r.index)).toEqual([0, 2]);
  });

  it('показывает время и воду, а у стадии без воды — прочерк', () => {
    const rows = recipeRows(perc, 'ru');
    expect(rows[0]?.dur).toBe('0:45');
    expect(rows[0]?.water).toBe('45 г');
    expect(recipeRows(imm, 'ru')[1]?.water).toBeNull();
  });

  it('единственную строку удалять нельзя', () => {
    expect(recipeRows(perc, 'ru').every((r) => r.canRemove)).toBe(true);
    expect(recipeRows(hyMid, 'ru').map((r) => r.canRemove)).toEqual([false]);
  });
});

describe('правка стадий', () => {
  it('шаги — ±5 с и ±10 г', () => {
    expect(bumpStageDuration(perc, 0, RECIPE_DUR_STEP)[0]).toEqual(['bloom', 50, 45]);
    expect(bumpStageWater(perc, 1, -RECIPE_WATER_STEP)[1]).toEqual(['pour', 40, 95]);
  });

  it('ниже нуля не уходит', () => {
    expect(bumpStageDuration(imm, 1, -RECIPE_DUR_STEP)[1]).toEqual(['stir', 0, 0]);
    expect(bumpStageWater([['pour', 30, 5]], 0, -RECIPE_WATER_STEP)[0]).toEqual(['pour', 30, 0]);
  });

  it('не трогает исходный план', () => {
    const before = JSON.stringify(perc);
    bumpStageDuration(perc, 0, RECIPE_DUR_STEP);
    bumpStageWater(perc, 0, RECIPE_WATER_STEP);
    removeStage(perc, 0);
    addPour(perc);
    expect(JSON.stringify(perc)).toBe(before);
  });

  it('удаление убирает ровно одну стадию', () => {
    expect(removeStage(perc, 1)).toEqual([
      ['bloom', 45, 45],
      ['pour', 40, 100],
      ['drain', 50, 0],
    ]);
  });
});

describe('addPour', () => {
  it('вставляет пролив перед хвостовым дренажом', () => {
    expect(addPour(perc)).toEqual([
      ['bloom', 45, 45],
      ['pour', 40, 105],
      ['pour', 40, 100],
      ['pour', 30, 50],
      ['drain', 50, 0],
    ]);
  });

  it('пропускает весь хвост дренажей, а не только последний', () => {
    const twoDrains: Stage[] = [
      ['steep', 60, 200],
      ['drain', 20, 0],
      ['drain', 30, 0],
    ];
    expect(addPour(twoDrains)[1]).toEqual(['pour', 30, 50]);
  });

  it('без дренажа в хвосте дописывает в конец', () => {
    expect(addPour(imm).at(-1)).toEqual(['pour', 30, 50]);
  });
});

describe('итоги', () => {
  it('складывают время и воду плана', () => {
    expect(recipeTotalLine(perc, 'ru')).toBe('итого 2:55 · 250 г');
    expect(recipeTotalLine(imm, 'en')).toBe('total 2:30 · 250 g');
  });

  it('о расхождении с полем ВОДА говорят тихо, а о совпадении молчат', () => {
    expect(recipeWaterNote(perc, 250, 'ru')).toBeNull();
    expect(recipeWaterNote(perc, 260, 'ru')).toBe('в рецепте 250 г из 260');
    expect(recipeWaterNote(perc, 260, 'en')).toBe('recipe holds 250 g of 260');
  });
});

describe('recipeValveAt', () => {
  it('берёт длительность стадии перед отметкой клапана', () => {
    expect(recipeValveAt(hyMid, 80)).toBe(80);
    expect(recipeValveAt(bumpStageDuration(hyMid, 0, 25), 80)).toBe(105);
  });

  it('без отметки клапана возвращает значение степпера', () => {
    expect(recipeValveAt(perc, 80)).toBe(80);
    // Отметка первой стадией — стадии перед ней нет.
    expect(recipeValveAt([['valve', 0, 0], ['drain', 30, 0]], 80)).toBe(80);
  });
});
