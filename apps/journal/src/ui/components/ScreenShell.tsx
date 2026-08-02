/**
 * The frame every screen sits in: a micro-label header, an optional «←», and a
 * scrolling body.
 *
 * The back button appears on every screen that is not a tab root, matching the
 * handoff rule «явная кнопка ← везде где вложенность» — Android's system back
 * is wired to the same action in BJ-6, but the on-screen one is not optional.
 *
 * Шапку рисует `ScreenHeader` (D-10): своя разметка каркаса тянула за собой
 * второй набор правил (`.screen__head`/`.screen__title`/`.back` в `tokens.css`)
 * на ту же шапку, и он разъезжался с макетом. Шапка в приложении одна.
 */

import type { ReactNode } from 'react';

import { type Screen, isTab } from '../../app/nav.js';
import { SCREEN_TITLES } from '../screenMeta.js';
import { ScreenHeader } from './ScreenHeader.js';

interface ScreenShellProps {
  screen: Screen;
  children?: ReactNode;
}

export function ScreenShell({ screen, children }: ScreenShellProps) {
  return (
    <section className="screen" data-screen={screen}>
      <ScreenHeader title={SCREEN_TITLES[screen]} back={!isTab(screen)} />
      <div className="screen__body">{children}</div>
    </section>
  );
}
