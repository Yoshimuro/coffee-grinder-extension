import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Журнал — заглушка. Фильтры-чипы, список и режим СРАВНИТЬ — BJ-4. */
export function Log() {
  return (
    <ScreenShell screen="log">
      <StubLinks to={['detail', 'compare']} />
    </ScreenShell>
  );
}
