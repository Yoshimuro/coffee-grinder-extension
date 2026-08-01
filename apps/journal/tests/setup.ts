// Dexie needs a real IndexedDB. `fake-indexeddb/auto` installs a spec-compliant
// in-memory one on globalThis, which is the standard way to exercise Dexie
// outside a browser (D-5).
import 'fake-indexeddb/auto';
