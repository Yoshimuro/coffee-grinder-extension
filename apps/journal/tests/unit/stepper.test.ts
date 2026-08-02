import { describe, expect, it } from 'vitest';

import {
  clampValue,
  decimalsOf,
  formatValue,
  parseDecimal,
  stepValue,
} from '../../src/ui/components/Stepper.js';

/** Помол: 0.0…9.0 шагом 0.1 — самый требовательный к округлению случай. */
const GRIND = { min: 0, max: 9, step: 0.1 };
/** Вода: 50…600 шагом 10. */
const WATER = { min: 50, max: 600, step: 10 };

describe('decimalsOf', () => {
  it('считает знаки после точки в шаге', () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(5)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.1)).toBe(1);
    expect(decimalsOf(0.05)).toBe(2);
  });
});

describe('clampValue', () => {
  it('зажимает по обоим краям', () => {
    expect(clampValue(-3, GRIND)).toBe(0);
    expect(clampValue(12, GRIND)).toBe(9);
    expect(clampValue(4.6, GRIND)).toBe(4.6);
  });

  it('округляет до знаков шага', () => {
    expect(clampValue(4.63, GRIND)).toBe(4.6);
    expect(clampValue(4.68, GRIND)).toBe(4.7);
    expect(clampValue(233, WATER)).toBe(233);
  });

  it('нечисло уводит в минимум, а не в NaN', () => {
    expect(clampValue(Number.NaN, GRIND)).toBe(0);
    expect(clampValue(Number.POSITIVE_INFINITY, WATER)).toBe(50);
  });

  it('уважает явное число знаков', () => {
    expect(clampValue(4.649, { ...GRIND, decimals: 2 })).toBe(4.65);
  });
});

describe('stepValue', () => {
  it('прибавляет и убавляет шаг', () => {
    expect(stepValue(4.6, 1, GRIND)).toBe(4.7);
    expect(stepValue(4.6, -1, GRIND)).toBe(4.5);
    expect(stepValue(250, 1, WATER)).toBe(260);
  });

  it('не выпускает за края', () => {
    expect(stepValue(9, 1, GRIND)).toBe(9);
    expect(stepValue(0, -1, GRIND)).toBe(0);
    expect(stepValue(600, 1, WATER)).toBe(600);
  });

  it('не копит двоичный мусор на длинной серии шагов', () => {
    let value = 0;
    for (let i = 0; i < 30; i++) value = stepValue(value, 1, GRIND);
    expect(value).toBe(3);
    for (let i = 0; i < 7; i++) value = stepValue(value, -1, GRIND);
    expect(value).toBe(2.3);
  });

  it('подтягивает нечисло к минимуму, а не роняет ряд', () => {
    expect(stepValue(Number.NaN, 1, GRIND)).toBe(0.1);
  });
});

describe('parseDecimal', () => {
  it('принимает запятую как разделитель', () => {
    expect(parseDecimal('4,6')).toBe(4.6);
    expect(parseDecimal('4.6')).toBe(4.6);
  });

  it('терпит пробелы, в том числе неразрывные', () => {
    expect(parseDecimal(' 250 ')).toBe(250);
    expect(parseDecimal('1 000')).toBe(1000);
  });

  it('возвращает null на незаконченном и мусорном вводе', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('.')).toBeNull();
    expect(parseDecimal('-')).toBeNull();
    expect(parseDecimal('около 15')).toBeNull();
  });

  it('пропускает отрицательные — зажим их обрежет позже', () => {
    expect(parseDecimal('-2')).toBe(-2);
    expect(clampValue(parseDecimal('-2') ?? 0, GRIND)).toBe(0);
  });
});

describe('formatValue', () => {
  it('держит постоянное число знаков', () => {
    expect(formatValue(4, GRIND)).toBe('4.0');
    expect(formatValue(4.6, GRIND)).toBe('4.6');
    expect(formatValue(250, WATER)).toBe('250');
  });
});
