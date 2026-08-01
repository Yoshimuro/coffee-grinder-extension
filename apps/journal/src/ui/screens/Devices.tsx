import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Список девайсов — заглушка. Мини-чертежи — BJ-4. */
export function Devices() {
  return (
    <ScreenShell screen="devices">
      <StubLinks to={['device']} />
    </ScreenShell>
  );
}
