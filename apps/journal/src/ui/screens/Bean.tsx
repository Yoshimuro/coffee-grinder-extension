import { ScreenShell } from '../components/ScreenShell.js';
import { StubLinks } from '../components/StubLinks.js';

/** Карточка пачки — заглушка. Фото, статы и заваривания — BJ-4. */
export function Bean() {
  return (
    <ScreenShell screen="bean">
      <StubLinks to={['brew']} />
    </ScreenShell>
  );
}
