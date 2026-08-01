import { beforeEach, describe, expect, it } from 'vitest';

import { SCREENS, TABS, isTab, useNav } from '../../src/app/nav.js';

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
