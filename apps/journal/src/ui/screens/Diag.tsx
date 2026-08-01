import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Диагностика — заглушка. Четыре шкалы 0–10, заметка и теги — BJ-4. */
export function Diag() {
  return (
    <ScreenShell screen="diag">
      <StubLinks to={['wheel']} />
    </ScreenShell>
  );
}
