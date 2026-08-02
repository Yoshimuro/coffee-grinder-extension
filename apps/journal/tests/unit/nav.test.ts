import { beforeEach, describe, expect, it } from 'vitest';

import {
  SCREENS,
  TABS,
  backAction,
  handleHardwareBack,
  isTab,
  useNav,
} from '../../src/app/nav.js';
import { TAB_LABEL_KEYS, tabLabel } from '../../src/ui/screenMeta.js';

function reset() {
  useNav.setState({ screen: 'home', stack: [] });
}

describe('nav store', () => {
  beforeEach(reset);

  it('covers the seventeen prototype screens', () => {
    expect(SCREENS).toHaveLength(17);
    expect(new Set(SCREENS).size).toBe(17);
  });

  it('starts on home with an empty stack', () => {
    const { screen, stack } = useNav.getState();
    expect(screen).toBe('home');
    expect(stack).toEqual([]);
  });

  it('go() pushes the screen being left', () => {
    useNav.getState().go('brew');
    expect(useNav.getState()).toMatchObject({ screen: 'brew', stack: ['home'] });

    useNav.getState().go('timer');
    expect(useNav.getState()).toMatchObject({ screen: 'timer', stack: ['home', 'brew'] });
  });

  it('back() unwinds the stack one screen at a time', () => {
    useNav.getState().go('brew');
    useNav.getState().go('timer');

    useNav.getState().back();
    expect(useNav.getState()).toMatchObject({ screen: 'brew', stack: ['home'] });

    useNav.getState().back();
    expect(useNav.getState()).toMatchObject({ screen: 'home', stack: [] });
  });

  it('back() on an empty stack falls to home', () => {
    // Reachable through a hardware back press on a tab root.
    useNav.setState({ screen: 'shelf', stack: [] });
    useNav.getState().back();
    expect(useNav.getState()).toMatchObject({ screen: 'home', stack: [] });
  });

  it('back() from home with an empty stack is a no-op', () => {
    useNav.getState().back();
    expect(useNav.getState()).toMatchObject({ screen: 'home', stack: [] });
  });

  it('setTab() clears the stack — tabs are roots, not history', () => {
    useNav.getState().go('brew');
    useNav.getState().go('timer');

    useNav.getState().setTab('log');
    expect(useNav.getState()).toMatchObject({ screen: 'log', stack: [] });

    useNav.getState().back();
    expect(useNav.getState().screen).toBe('home');
  });

  it('go() can revisit a screen already on the stack', () => {
    useNav.getState().go('shelf');
    useNav.getState().go('bean');
    useNav.getState().go('shelf');
    expect(useNav.getState()).toMatchObject({ screen: 'shelf', stack: ['home', 'shelf', 'bean'] });
  });

  it('isTab() is true exactly for the four bottom-bar screens', () => {
    expect(TABS).toEqual(['home', 'shelf', 'log', 'more']);
    for (const screen of SCREENS) {
      expect(isTab(screen)).toBe((TABS as readonly string[]).includes(screen));
    }
  });
});

/*
 * Эмуляторный QA (BJ-7, баг 1): интерфейс переключался на EN, а нижняя панель
 * оставалась русской — подписи были захардкожены мимо таблицы строк.
 */
describe('подписи табов', () => {
  it('берутся из таблицы строк и меняются вместе с языком', () => {
    expect(TABS.map((tab) => tabLabel(tab, 'ru'))).toEqual([
      'ГЛАВНЫЙ',
      'ПОЛКА',
      'ЖУРНАЛ',
      'ЕЩЁ',
    ]);
    expect(TABS.map((tab) => tabLabel(tab, 'en'))).toEqual(['HOME', 'SHELF', 'LOG', 'MORE']);
  });

  it('у каждого таба свой ключ, и все они из группы nav_*', () => {
    for (const tab of TABS) {
      expect(TAB_LABEL_KEYS[tab]).toBe(`nav_${tab}`);
      expect(tabLabel(tab, 'ru')).not.toBe(tabLabel(tab, 'en'));
    }
  });
});

/*
 * Эмуляторный QA (BJ-7, баг 2): системная «назад» закрывала приложение с любого
 * вложенного экрана. Решение — чистая функция от экрана и глубины стека.
 */
describe('backAction', () => {
  beforeEach(reset);

  it('возвращает назад, пока стек не пуст', () => {
    expect(backAction('detail', 1)).toBe('back');
    expect(backAction('timer', 3)).toBe('back');
    expect(backAction('home', 1)).toBe('back');
  });

  it('возвращает назад с вложенного экрана даже с пустым стеком', () => {
    for (const screen of SCREENS) {
      if (isTab(screen)) continue;
      expect(backAction(screen, 0), screen).toBe('back');
    }
  });

  it('сворачивает только с корневого таба без истории', () => {
    for (const tab of TABS) {
      expect(backAction(tab, 0), tab).toBe('minimize');
    }
  });

  it('handleHardwareBack() отматывает навигацию и сообщает, что справился', () => {
    useNav.getState().go('log');
    useNav.getState().go('detail');

    expect(handleHardwareBack()).toBe(true);
    expect(useNav.getState()).toMatchObject({ screen: 'log', stack: ['home'] });

    expect(handleHardwareBack()).toBe(true);
    expect(useNav.getState()).toMatchObject({ screen: 'home', stack: [] });
  });

  it('handleHardwareBack() с корня отдаёт false и не трогает экран', () => {
    useNav.setState({ screen: 'shelf', stack: [] });
    expect(handleHardwareBack()).toBe(false);
    expect(useNav.getState()).toMatchObject({ screen: 'shelf', stack: [] });
  });
});
