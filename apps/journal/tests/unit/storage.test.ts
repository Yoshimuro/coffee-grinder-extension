import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNative } from '../../src/platform/native.js';
import { storagePersistence } from '../../src/pwa/storage.js';

vi.mock('../../src/platform/native.js', () => ({ isNative: vi.fn(() => false) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); vi.mocked(isNative).mockReturnValue(false); });

describe('persistent browser storage', () => {
  it('does not request permission again when already protected', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', { storage: { persisted: async () => true, persist } });
    expect(await storagePersistence(true)).toBe('persistent');
    expect(persist).not.toHaveBeenCalled();
  });

  it.each([true, false])('reports the actual browser decision: %s', async (granted) => {
    const persist = vi.fn(async () => granted);
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist } });
    expect(await storagePersistence()).toBe('best-effort');
    expect(persist).not.toHaveBeenCalled();
    expect(await storagePersistence(true)).toBe(granted ? 'persistent' : 'best-effort');
  });

  it('handles an unsupported API', async () => {
    vi.stubGlobal('navigator', {});
    expect(await storagePersistence(true)).toBe('unavailable');
  });

  it('does not block startup if storage permissions throw', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: async () => { throw new Error('Restricted'); } } });
    expect(await storagePersistence(true)).toBe('unavailable');
  });

  it('does not request web storage permission inside the APK', async () => {
    vi.mocked(isNative).mockReturnValue(true);
    const persist = vi.fn();
    vi.stubGlobal('navigator', { storage: { persist } });
    expect(await storagePersistence(true)).toBe('native');
    expect(persist).not.toHaveBeenCalled();
  });
});
