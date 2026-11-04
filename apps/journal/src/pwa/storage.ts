import { isNative } from '../platform/native.js';

export type StoragePersistence = 'persistent' | 'best-effort' | 'unavailable' | 'native';

/** The browser owns this permission; never infer it from an installed icon. */
export async function storagePersistence(request = false): Promise<StoragePersistence> {
  if (isNative()) return 'native';
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage?.persisted) return 'unavailable';
  try {
    if (await storage.persisted()) return 'persistent';
    if (request && storage.persist && await storage.persist()) return 'persistent';
    return 'best-effort';
  } catch {
    // Unsupported/private/restricted contexts must not prevent opening the DB.
    return 'unavailable';
  }
}
