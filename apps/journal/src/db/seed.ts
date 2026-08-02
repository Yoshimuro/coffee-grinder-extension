/**
 * First-run seed (D-2).
 *
 * Only settings are seeded — no grinder, no shelf, no journal. D-2 used to put
 * one grinder on the shelf (the Timemore Chestnut S3 the prototype starts on)
 * so the converter had something to convert into, but that is somebody else's
 * grinder: it shows up on the converter and in the brew setup as if the user
 * owned it, and the numbers under it are then honestly computed nonsense. An
 * empty shelf asks for the real grinder instead, the same way the empty log
 * asks for the first brew.
 *
 * Idempotence is carried by the `seeded` setting, written last inside the same
 * transaction as everything else, so a crash mid-seed leaves the flag unset and
 * the next launch simply retries.
 */

import { type BrewJournalDB, db } from './schema.js';

/**
 * Runs the first-run seed. Safe to call on every launch.
 *
 * Returns whether anything was written, which the tests assert on.
 */
export async function seed(database: BrewJournalDB = db): Promise<boolean> {
  return database.transaction('rw', database.settings, async (): Promise<boolean> => {
    const flag = await database.settings.get('seeded');
    if (flag?.value === true) return false;

    await database.settings.bulkPut([
      { key: 'lang', value: 'ru' },
      { key: 'theme', value: 'dark' },
      { key: 'calib', value: { offset: 0, src: null } },
      { key: 'recents', value: [] },
    ]);

    await database.settings.put({ key: 'seeded', value: true });
    return true;
  });
}
