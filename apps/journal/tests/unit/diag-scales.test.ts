import { describe, expect, it } from 'vitest';

import type { Diagnostics } from '../../src/db/schema.js';
import {
  SCALES,
  SCALE_CELLS,
  SCALE_MAX,
  START_DIAG,
  cellFilled,
  clampScale,
  diagLine,
  setScale,
} from '../../src/ui/screens/journal/diag-scales.js';

const DIAG: Diagnostics = { acid: 5, bitter: 4, body: 6, balance: 6 };

describe('SCALES', () => {
  it('перечисляет четыре шкалы в порядке экрана', () => {
    expect(SCALES.map((s) => s.key)).toEqual(['acid', 'bitter', 'body', 'balance']);
  });

  it('подписывает balance «СЛАДОСТЬЮ» — расхождение имени и подписи намеренное', () => {
    expect(SCALES[3]?.key).toBe('balance');
    expect(SCALES[3]?.label).toBe('diag_balance');
  });

  it('шкала — одиннадцать ячеек, 0…10', () => {
    expect(SCALE_CELLS).toBe(11);
    expect(SCALE_MAX).toBe(10);
  });

  it('стартует с середины каждой шкалы', () => {
    expect(START_DIAG).toEqual({ acid: 5, bitter: 5, body: 5, balance: 5 });
  });
});

describe('clampScale', () => {
  it('зажимает в пределы', () => {
    expect(clampScale(-3)).toBe(0);
    expect(clampScale(0)).toBe(0);
    expect(clampScale(10)).toBe(10);
    expect(clampScale(11)).toBe(10);
  });

  it('округляет: ячеек всего одиннадцать', () => {
    expect(clampScale(4.4)).toBe(4);
    expect(clampScale(4.6)).toBe(5);
  });

  it('нечисло падает в ноль, а не в NaN', () => {
    expect(clampScale(Number.NaN)).toBe(0);
  });
});

describe('setScale', () => {
  it('меняет одну шкалу и не трогает исходную диагностику', () => {
    const next = setScale(DIAG, 'acid', 8);
    expect(next).toEqual({ acid: 8, bitter: 4, body: 6, balance: 6 });
    expect(DIAG.acid).toBe(5);
  });

  it('зажимает по дороге', () => {
    expect(setScale(DIAG, 'body', 99).body).toBe(10);
  });

  it('ноль — валидное значение, а не «не выбрано»', () => {
    expect(setScale(DIAG, 'bitter', 0).bitter).toBe(0);
  });
});

describe('cellFilled', () => {
  it('заливает ячейки до значения включительно', () => {
    const filled = Array.from({ length: SCALE_CELLS }, (_, i) => cellFilled(5, i));
    expect(filled.filter(Boolean)).toHaveLength(6);
    expect(filled[5]).toBe(true);
    expect(filled[6]).toBe(false);
  });

  it('у нуля залита одна ячейка', () => {
    expect(cellFilled(0, 0)).toBe(true);
    expect(cellFilled(0, 1)).toBe(false);
  });

  it('у десятки залиты все', () => {
    expect(Array.from({ length: SCALE_CELLS }, (_, i) => cellFilled(10, i)).every(Boolean)).toBe(
      true,
    );
  });
});

describe('diagLine', () => {
  it('сворачивает диагностику в строку с одной буквой на шкалу', () => {
    expect(diagLine(DIAG, 'ru')).toBe('К 5 · Г 4 · Т 6 · С 6');
  });

  it('в английском букв две — иначе шкалы не различить', () => {
    expect(diagLine(DIAG, 'en')).toBe('AC 5 · BI 4 · BO 6 · SW 6');
  });
});
