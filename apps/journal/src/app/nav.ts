/**
 * Navigation — a screen plus a manual stack, no router library (D-3).
 *
 * The semantics are the prototype's, kept identical so the screens port over
 * without rewiring (component-report §1.3):
 *
 *   go(s)     push the current screen, then show `s`
 *   back()    pop; an empty stack falls back to `home`
 *   setTab(k) show `k` and clear the stack — tabs are roots, not history
 *
 * It lives in zustand rather than React state because the brew timer will need
 * to read and drive navigation from outside the component tree (design §5).
 */

import { create } from 'zustand';

/** Every screen in the app. Taken from the prototype inventory (§2). */
export const SCREENS = [
  'home',
  'conv',
  'shelf',
  'bean',
  'beanAdd',
  'devices',
  'device',
  'brew',
  'timer',
  'rateLater',
  'diag',
  'wheel',
  'log',
  'detail',
  'compare',
  'more',
  'spec',
] as const;

export type Screen = (typeof SCREENS)[number];

/** The four screens reachable from the bottom bar; also the only roots. */
export const TABS = ['home', 'shelf', 'log', 'more'] as const;

export type Tab = (typeof TABS)[number];

/** The bottom bar is hidden everywhere else, so nesting reads as nesting. */
export function isTab(screen: Screen): screen is Tab {
  return (TABS as readonly Screen[]).includes(screen);
}

export interface NavState {
  screen: Screen;
  /** Screens to return through, oldest first. */
  stack: Screen[];
  go: (screen: Screen) => void;
  back: () => void;
  setTab: (tab: Tab) => void;
}

export const useNav = create<NavState>((set) => ({
  screen: 'home',
  stack: [],

  go: (screen) => set((s) => ({ screen, stack: [...s.stack, s.screen] })),

  back: () =>
    set((s) => ({
      screen: s.stack[s.stack.length - 1] ?? 'home',
      stack: s.stack.slice(0, -1),
    })),

  setTab: (tab) => set({ screen: tab, stack: [] }),
}));
