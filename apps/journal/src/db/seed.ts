/**
 * First-run seed (D-2).
 *
 * The app needs a non-empty database to be usable at all: the converter and the
 * brew setup both target «своя кофемолка», and with none the user faces an
 * empty picker before they have done anything. So one grinder is seeded — the
 * same Timemore Chestnut S3 the prototype starts on — and nothing else. The
 * prototype's demo shelf and demo journal are *not* seeded: per the handoff
 * README the empty screens invite the first brew instead of faking history.
 *
 * Idempotence is carried by the `seeded` setting, written last inside the same
 * transaction as everything else, so a crash mid-seed leaves the flag unset and
 * the next launch simply retries.
 */

import { type Grinder, grinderById, searchGrinders } from '@coffee/core';

import { type BrewJournalDB, type GrinderRecord, db } from './schema.js';

/**
 * Catalogue id named in D-2. It does not exist under this spelling — see
 * `findSeedGrinder` — but it is kept here as the documented intent.
 */
export const SEED_GRINDER_ID = 'timemore-chestnut-s3';

/** Exact model string in the catalogue, used to disambiguate the search. */
const SEED_GRINDER_MODEL = 'chestnut s3';

/**
 * Resolves the grinder D-2 asks for.
 *
 * The literal id is tried first so the day the catalogue adopts that spelling
 * this keeps working. Today it resolves through search instead, and the model
 * has to match exactly: `searchGrinders('timemore chestnut s3')` also returns
 * the *S3 ESP*, a different grinder with a different burr set.
 */
export function findSeedGrinder(): Grinder | undefined {
  const exact = grinderById(SEED_GRINDER_ID);
  if (exact) return exact;

  return searchGrinders('timemore chestnut s3').find(
    (g) => g.model.toLowerCase() === SEED_GRINDER_MODEL,
  );
}

/**
 * Flattens a catalogue entry into an owned-grinder record.
 *
 * Only linear entries can be flattened. An anchors curve has no single
 * "microns per step" and inventing one would put a fabricated number in front
 * of the user on the converter's tech line, so those are rejected outright.
 */
export function toOwnGrinder(grinder: Grinder): GrinderRecord | undefined {
  if (grinder.calibration.kind !== 'linear') return undefined;

  return {
    id: grinder.id,
    name: `${grinder.brand} ${grinder.model}`,
    datasetId: grinder.id,
    micronsPerStep: grinder.calibration.micronsPerStep,
    zeroOffsetMicrons: grinder.calibration.zeroOffsetMicrons,
    scale: { ...grinder.scale },
  };
}

/**
 * Runs the first-run seed. Safe to call on every launch.
 *
 * Returns whether anything was written, which the tests assert on.
 */
export async function seed(database: BrewJournalDB = db): Promise<boolean> {
  return database.transaction(
    'rw',
    database.settings,
    database.grinders,
    async (): Promise<boolean> => {
      const flag = await database.settings.get('seeded');
      if (flag?.value === true) return false;

      await database.settings.bulkPut([
        { key: 'lang', value: 'ru' },
        { key: 'calib', value: { offset: 0, src: null } },
        { key: 'recents', value: [] },
      ]);

      // Guarded separately from the flag: an install that already has grinders
      // (restored from an import, say) must not gain a duplicate.
      if ((await database.grinders.count()) === 0) {
        const found = findSeedGrinder();
        const record = found ? toOwnGrinder(found) : undefined;
        if (record) await database.grinders.put(record);
      }

      await database.settings.put({ key: 'seeded', value: true });
      return true;
    },
  );
}
