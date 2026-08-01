import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Полка — заглушка. Карточки пачек и пустое состояние — BJ-4. */
export function Shelf() {
  return (
    <ScreenShell screen="shelf">
      <StubLinks to={['bean', 'beanAdd']} />
    </ScreenShell>
  );
}
