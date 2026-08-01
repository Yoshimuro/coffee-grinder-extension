/**
 * The frame every screen sits in: a micro-label header, an optional «←», and a
 * scrolling body.
 *
 * The back button appears on every screen that is not a tab root, matching the
 * handoff rule «явная кнопка ← везде где вложенность» — Android's system back
 * is wired to the same action in BJ-6, but the on-screen one is not optional.
 */

import type { ReactNode } from 'react';

import { type Screen, isTab, useNav } from '../../app/nav.js';
import { SCREEN_TITLES } from '../screenMeta.js';

interface ScreenShellProps {
  screen: Screen;
  children?: ReactNode;
}

export function ScreenShell({ screen, children }: ScreenShellProps) {
  const back = useNav((s) => s.back);
  const nested = !isTab(screen);

  return (
    <section className="screen" data-screen={screen}>
      <header className="screen__head">
        {nested ? (
          <button type="button" className="back" onClick={back} aria-label="Назад">
            ←
          </button>
        ) : null}
        <h1 className="screen__title">{SCREEN_TITLES[screen]}</h1>
      </header>
      <div className="screen__body">{children}</div>
    </section>
  );
}
