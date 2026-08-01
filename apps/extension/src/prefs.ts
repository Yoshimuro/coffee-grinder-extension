/**
 * Remembers what the user last had selected. No account, no sync — just
 * `chrome.storage.local`, scoped to the browser profile, so the popup reopens
 * where they left off.
 */

export interface Prefs {
  fromId: string | null;
  toId: string | null;
  fromSetting: number | null;
  /** Most recently selected grinder ids, newest first. Shared by both fields. */
  recentIds: string[];
}

const KEY = 'cgc.prefs.v1';

export const DEFAULT_PREFS: Prefs = {
  fromId: null,
  toId: null,
  fromSetting: null,
  recentIds: [],
};

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

/**
 * The recents list with `id` moved to the front.
 *
 * The storage key is unchanged: `loadPrefs` merges over `DEFAULT_PREFS`, so an
 * object stored before this field existed reads back with an empty list rather
 * than `undefined`, and needs no migration.
 */
export function pushRecent(recents: string[], id: string, limit = 5): string[] {
  return [id, ...recents.filter((existing) => existing !== id)].slice(0, limit);
}
