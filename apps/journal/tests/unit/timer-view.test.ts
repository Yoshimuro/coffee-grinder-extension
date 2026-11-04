import { describe, expect, it } from 'vitest';

import type { DeviceRecord, Stage } from '../../src/db/schema.js';
import {
  beanLine,
  brewerLabel,
  mainButtonLabel,
  nextLine,
  recipeLine,
  segments,
  stageCounter,
  stageElapsedLine,
  stageTitle,
  targetLine,
} from '../../src/ui/screens/brewing/timer-view.js';

/* Перколяция на два пролива: 45 + 40 + 40 + 50 = 175 с, 250 г воды. */
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

/* ── Шкала ───────────────────────────────────────────────────────────────── */

describe('segments — шкала стадий', () => {
  it('ширина пропорциональна плановой длительности минус зазор', () => {
    const segs = segments(perc, 0, 0, false);
    // 45/175*100 − 0.6 = 25.1; 40/175*100 − 0.6 = 22.3; 50/175*100 − 0.6 = 28.0
    expect(segs.map((s) => s.width)).toEqual([25.1, 22.3, 22.3, 28]);
  });

  it('маркер нулевой длительности занимает ровно процент', () => {
    expect(segments(imm, 0, 0, false).map((s) => s.width)).toEqual([79.4, 1, 19.4]);
  });

  it('пройденные залиты целиком, будущие пусты, текущая — по времени', () => {
    expect(segments(perc, 1, 20, false).map((s) => s.fill)).toEqual([100, 50, 0, 0]);
  });

  it('перелив по времени не выходит за сто процентов', () => {
    expect(segments(perc, 0, 90, false)[0]?.fill).toBe(100);
  });

  it('в паузе текущая стадия показана целиком — её время уже записано', () => {
    expect(segments(perc, 1, 5, true).map((s) => s.fill)).toEqual([100, 100, 0, 0]);
  });
});

/* ── Строки ──────────────────────────────────────────────────────────────── */

describe('targetLine', () => {
  it('складывает плановые длительности', () => {
    expect(targetLine(perc, 'ru')).toBe('рецепт 2:55');
    expect(targetLine(imm, 'en')).toBe('recipe 2:30');
  });
});

describe('stageCounter и stageTitle', () => {
  it('считают стадии от единицы', () => {
    expect(stageCounter(perc, 0, 'ru', false)).toBe('1 / 4');
    expect(stageCounter(perc, 3, 'ru', false)).toBe('4 / 4');
  });

  it('в паузе счёт стоит, а имя стадии — «ПАУЗА»', () => {
    expect(stageCounter(perc, 1, 'ru', true)).toBe('· · ·');
    expect(stageTitle(perc, 1, 'ru', true)).toBe('пауза');
    expect(stageTitle(perc, 1, 'en', true)).toBe('pause');
  });

  it('называет активную стадию', () => {
    expect(stageTitle(perc, 0, 'ru', false)).toBe('смачивание');
    expect(stageTitle(perc, 3, 'en', false)).toBe('let the water drain');
    // Индекс за краем плана строку не ломает.
    expect(stageTitle(perc, 9, 'ru', false)).toBe('');
  });
});

describe('stageElapsedLine — фактическое время стадии', () => {
  it('считает вперёд, а не назад', () => {
    expect(stageElapsedLine(6, false)).toBe('0:06');
    expect(stageElapsedLine(57, false)).toBe('0:57');
  });

  it('в паузе время стекания растёт со знаком', () => {
    expect(stageElapsedLine(12, true)).toBe('+ 0:12');
  });
});

describe('recipeLine — тихая цель стадии', () => {
  it('называет время и воду стадии', () => {
    expect(recipeLine(perc, 0, 'ru', false)).toBe('рецепт 0:45 · 45 г');
    expect(recipeLine(perc, 1, 'en', false)).toBe('recipe 0:40 · 105 g');
  });

  it('стадию без воды называет одним временем', () => {
    expect(recipeLine(perc, 3, 'ru', false)).toBe('рецепт 0:50');
    expect(recipeLine(imm, 2, 'en', false)).toBe('recipe 0:30');
  });

  it('у маркера цели нет — строка пустая', () => {
    expect(recipeLine(imm, 1, 'ru', false)).toBe('');
    // Индекс за краем плана строку не ломает.
    expect(recipeLine(perc, 9, 'ru', false)).toBe('');
  });

  it('в паузе говорит про стекание', () => {
    expect(recipeLine(perc, 1, 'ru', true)).toBe('даём стечь');
    expect(recipeLine(perc, 1, 'en', true)).toBe('letting it drain');
  });
});

describe('nextLine', () => {
  it('называет следующую стадию и её воду', () => {
    expect(nextLine(perc, 0, 'ru')).toBe('дальше: пролив · 105 г');
    expect(nextLine(perc, 2, 'ru')).toBe('дальше: стекание');
    expect(nextLine(perc, 0, 'en')).toBe('next: pour · 105 g');
  });

  it('на последней стадии так и говорит', () => {
    expect(nextLine(perc, 3, 'ru')).toBe('последняя стадия');
    expect(nextLine(perc, 3, 'en')).toBe('last stage');
  });
});

describe('mainButtonLabel', () => {
  it('обычный переход — «ДАЛЬШЕ»', () => {
    expect(mainButtonLabel(perc, 0, 'ru', false)).toBe('дальше');
    expect(mainButtonLabel(perc, 1, 'en', false)).toBe('next');
  });

  it('на последней стадии явно обещает сохранение', () => {
    expect(mainButtonLabel(perc, 3, 'ru', false)).toBe('завершить и сохранить');
    expect(mainButtonLabel(perc, 3, 'en', false)).toBe('finish and save');
  });

  it('переход к стеканию называет следующий этап, включая выход из паузы', () => {
    expect(mainButtonLabel(perc, 2, 'ru', false)).toBe('перейти к стеканию');
    expect(mainButtonLabel(perc, 2, 'en', true)).toBe('let the water drain');
  });

  it('маркер виден пользователю только как подпись кнопки', () => {
    expect(mainButtonLabel(imm, 0, 'ru', false)).toBe('размешать');
    expect(mainButtonLabel([['steep', 150, 250], ['valve', 0, 0], ['drain', 60, 0]], 0, 'ru', false)).toBe(
      'открыть клапан',
    );
  });

  it('в паузе кнопка называет стадию, к которой возвращает', () => {
    expect(mainButtonLabel(perc, 1, 'ru', true)).toBe('пролив');
    // Пауза на последней стадии недоступна, но подпись всё равно осмысленна.
    expect(mainButtonLabel(perc, 3, 'ru', true)).toBe('завершить и сохранить');
  });
});

describe('шапка таймера', () => {
  it('срезает бренд и подставляет форму кофе у дрипа', () => {
    expect(brewerLabel('beans', v60, 'ru')).toBe('V60-02');
    expect(brewerLabel('beans', null, 'ru')).toBe('—');
    expect(brewerLabel('drip', v60, 'ru')).toBe('дрип-пакет');
  });

  it('собирает строку пачки, девайса и температуры', () => {
    expect(beanLine('Ява Золотая', 'beans', v60, 94, 'ru')).toBe('Ява Золотая · V60-02 · 94°');
    expect(beanLine(undefined, 'beans', null, 92, 'ru')).toBe('— · — · 92°');
  });
});
