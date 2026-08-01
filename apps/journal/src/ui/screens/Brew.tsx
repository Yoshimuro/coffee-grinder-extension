import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Сетап заваривания — заглушка. Зерно, девайс, помол, доза/вода/T — BJ-4. */
export function Brew() {
  return (
    <ScreenShell screen="brew">
      <StubLinks to={['devices', 'timer']} />
    </ScreenShell>
  );
}
