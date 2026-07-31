/**
 * Remembers what the user last had selected. No account, no sync — just
 * `chrome.storage.local`, scoped to the browser profile, so the popup reopens
 * where they left off.
 */

export interface Prefs {
  fromId: string | null;
  toId: string | null;
  fromSetting: number | null;
}

const KEY = 'cgc.prefs.v1';

export const DEFAULT_PREFS: Prefs = { fromId: null, toId: null, fromSetting: null };

/** True when running inside an extension rather than a plain page or a test. */
function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && chrome.storage?.local !== undefined;
}

export async function loadPrefs(): Promise<Prefs> {
  if (!hasStorage()) return { ...DEFAULT_PREFS };
  try {
    const stored = await chrome.storage.local.get(KEY);
    return { ...DEFAULT_PREFS, ...(stored[KEY] as Partial<Prefs> | undefined) };
  } catch {
    // A corrupt or unreadable profile store should never block the converter.
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  if (!hasStorage()) return;
  try {
    await chrome.storage.local.set({ [KEY]: prefs });
  } catch {
    // Persistence is a convenience; losing it must not surface as an error.
  }
}
