import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Настройки — заглушка. Кофемолки, язык, экспорт/импорт — BJ-4/BJ-6. */
export function More() {
  return (
    <ScreenShell screen="more">
      <StubLinks to={['devices', 'spec']} />
    </ScreenShell>
  );
}
