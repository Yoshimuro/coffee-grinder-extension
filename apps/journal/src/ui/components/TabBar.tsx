/**
 * Bottom navigation. Rendered only on the four root screens — see `App`.
 * Its bottom padding carries the safe-area inset, so the labels clear the
 * home indicator without the whole app being inset.
 */

import { TABS, useNav } from '../../app/nav.js';
import { TAB_LABELS } from '../screenMeta.js';

export function TabBar() {
  const screen = useNav((s) => s.screen);
  const setTab = useNav((s) => s.setTab);

  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={tab === screen ? 'tab tab--on' : 'tab'}
          aria-current={tab === screen ? 'page' : undefined}
          onClick={() => setTab(tab)}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
