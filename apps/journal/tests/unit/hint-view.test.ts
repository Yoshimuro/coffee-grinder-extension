import { describe, expect, it } from 'vitest';

import { HINTS } from '../../src/data/hints.js';
import { STR } from '../../src/data/strings.js';
import {
  CARD_ROOM,
  MIN_ABOVE,
  cardAnchor,
  hintsForScreen,
  holeBox,
  isVisibleBox,
  pendingHints,
  stepCounter,
} from '../../src/ui/hints/hint-view.js';

const VIEW = { width: 393, height: 852 };

describe('реестр подсказок', () => {
  it('не содержит повторов id: они лежат в базе как показанные', () => {
    const ids = HINTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('каждая подсказка ссылается на существующую строку в обоих языках', () => {
    for (const hint of HINTS) {
      expect(STR.ru[hint.key], hint.id).toBeTruthy();
      expect(STR.en[hint.key], hint.id).toBeTruthy();
    }
  });

  /* Таймер оставлен без подсказок сознательно: там идёт заваривание, и
     затемнение экрана стоило бы человеку секунд. */
  it('на таймере подсказок нет', () => {
    expect(hintsForScreen('timer')).toEqual([]);
  });

  it('не больше четырёх подсказок на экран', () => {
    const perScreen = new Map<string, number>();
    for (const hint of HINTS) perScreen.set(hint.screen, (perScreen.get(hint.screen) ?? 0) + 1);
    for (const [screen, count] of perScreen) expect(count, screen).toBeLessThanOrEqual(4);
  });
});

describe('pendingHints', () => {
  it('отдаёт подсказки экрана в порядке реестра', () => {
    expect(pendingHints('home', [], true).map((h) => h.id)).toEqual([
      'h-home-brew',
      'h-home-conv',
      'h-home-taste',
      'h-home-pending',
    ]);
  });

  it('выбрасывает показанные', () => {
    const ids = pendingHints('home', ['h-home-brew', 'h-home-taste'], true).map((h) => h.id);
    expect(ids).toEqual(['h-home-conv', 'h-home-pending']);
  });

  it('молчит при выключенных подсказках', () => {
    expect(pendingHints('home', [], false)).toEqual([]);
  });

  it('не путает экраны', () => {
    expect(pendingHints('conv', [], true).every((h) => h.screen === 'conv')).toBe(true);
  });
});

describe('holeBox', () => {
  it('расширяет зону на отступ', () => {
    const box = holeBox({ left: 100, top: 200, width: 80, height: 40 }, VIEW, 6);
    expect(box).toEqual({ left: 94, top: 194, width: 92, height: 52 });
  });

  it('зажимает вырез окном: у края иначе осталась бы светлая полоса', () => {
    const box = holeBox({ left: 0, top: 0, width: 393, height: 48 }, VIEW, 6);
    expect(box.left).toBe(0);
    expect(box.top).toBe(0);
    expect(box.width).toBe(393);
    expect(box.height).toBe(54);
  });
});

describe('cardAnchor', () => {
  it('зона в верхней половине — карточка под ней', () => {
    const anchor = cardAnchor({ left: 0, top: 100, width: 393, height: 60 }, VIEW, 12);
    expect(anchor).toEqual({ side: 'below', offset: 172 });
  });

  it('зона в нижней половине — карточка над ней', () => {
    const anchor = cardAnchor({ left: 0, top: 600, width: 393, height: 60 }, VIEW, 12);
    expect(anchor).toEqual({ side: 'above', offset: 264 });
  });

  it('зона у самого низа не прижимает карточку к полосе «скрыть»', () => {
    const anchor = cardAnchor({ left: 0, top: 840, width: 393, height: 12 }, VIEW, 12);
    expect(anchor.side).toBe('above');
    expect(anchor.offset).toBe(MIN_ABOVE);
  });

  /* Кольцо колеса вкусов: серединой оно в верхней половине экрана, а места под
     собой не оставляет — по середине решать нельзя. */
  it('высокая зона уводит карточку наверх, а не под нижнюю полосу', () => {
    const anchor = cardAnchor({ left: 0, top: 150, width: 393, height: 560 }, VIEW, 12);
    expect(anchor.side).toBe('above');
    expect(anchor.offset).toBeLessThanOrEqual(VIEW.height - CARD_ROOM);
  });

  it('карточка над зоной не уезжает за верхний край', () => {
    const anchor = cardAnchor({ left: 0, top: 0, width: 393, height: 800 }, VIEW, 12);
    expect(anchor.offset).toBe(VIEW.height - CARD_ROOM);
  });
});

describe('isVisibleBox и stepCounter', () => {
  it('схлопнутая зона видимой не считается', () => {
    expect(isVisibleBox(null)).toBe(false);
    expect(isVisibleBox({ left: 0, top: 0, width: 0, height: 40 })).toBe(false);
    expect(isVisibleBox({ left: 0, top: 0, width: 10, height: 40 })).toBe(true);
  });

  it('одиночная подсказка счётчика не получает', () => {
    expect(stepCounter(0, 1)).toBe('');
    expect(stepCounter(0, 3)).toBe('1 / 3');
    expect(stepCounter(2, 3)).toBe('3 / 3');
  });
});
