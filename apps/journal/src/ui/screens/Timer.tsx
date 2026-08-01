import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Таймер — заглушка. Движок стадий и пауз — BJ-3, экран — BJ-4. */
export function Timer() {
  return (
    <ScreenShell screen="timer">
      <StubLinks to={['rateLater', 'diag']} />
    </ScreenShell>
  );
}
