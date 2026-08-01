/**
 * Temporary scaffolding: the outgoing links of a stub screen.
 *
 * The screens have no content yet, but every one of the seventeen has to be
 * reachable and every «←» has to unwind the stack it was pushed onto — that is
 * an acceptance criterion of BJ-2. So each stub lists the screens the prototype
 * reaches from it, as plain buttons. BJ-4 deletes this component as it fills
 * the screens in.
 */

import { type Screen, useNav } from '../../app/nav.js';
import { SCREEN_TITLES } from '../screenMeta.js';
import './StubLinks.css';

interface StubLinksProps {
  to: readonly Screen[];
}

export function StubLinks({ to }: StubLinksProps) {
  const go = useNav((s) => s.go);

  return (
    <div className="stub-links">
      {to.map((screen) => (
        <button key={screen} type="button" className="btn" onClick={() => go(screen)}>
          {SCREEN_TITLES[screen]}
        </button>
      ))}
    </div>
  );
}
