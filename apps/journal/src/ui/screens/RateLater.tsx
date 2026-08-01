import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Интерстишл «оценка позже» — заглушка. ОЦЕНИТЬ СЕЙЧАС / ПОЗЖЕ — BJ-4. */
export function RateLater() {
  return (
    <ScreenShell screen="rateLater">
      <StubLinks to={['diag']} />
    </ScreenShell>
  );
}
