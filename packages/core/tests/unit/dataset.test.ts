import { describe, expect, it } from 'vitest';
import {
  DATASET,
  allGrinders,
  displayName,
  grinderById,
  groupByBrand,
  searchGrinders,
} from '../../src/dataset.js';
import { micronsToSetting, settingSteps, settingToMicrons } from '../../src/convert.js';

describe('bundled dataset', () => {
  it('ships grinders and brew methods', () => {
    expect(allGrinders().length).toBeGreaterThan(0);
    expect(DATASET.methods.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = allGrinders().map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cites a source for every entry', () => {
    for (const g of allGrinders()) {
      expect(g.sources.length, `${g.id} has no sources`).toBeGreaterThan(0);
    }
  });

  it('produces a monotonically increasing, positive micron curve for every grinder', () => {
    for (const g of allGrinders()) {
      const steps = settingSteps(g);
      let previous = -Infinity;
      for (const setting of steps) {
        const microns = settingToMicrons(g, setting);
        // Zero is legitimate: hand grinders zeroed at burr contact really do
        // have no gap at setting 0. Negative would mean a broken calibration.
        expect(microns, `${g.id} at ${setting} is negative`).toBeGreaterThanOrEqual(0);
        expect(microns, `${g.id} is not monotonic at ${setting}`).toBeGreaterThan(previous);
        previous = microns;
      }
    }
  });

  it('keeps every grinder within a physically plausible range', () => {
    for (const g of allGrinders()) {
      const coarsest = settingToMicrons(g, g.scale.max);
      // Nothing brewable is coarser than ~2500 um; a value past that means a
      // step size or an anchor is off by an order of magnitude.
      expect(coarsest, `${g.id} tops out at ${coarsest} um`).toBeLessThan(2500);
      expect(coarsest, `${g.id} tops out at ${coarsest} um`).toBeGreaterThan(400);
    }
  });

  it('covers espresso and filter across the catalogue', () => {
    const reaches = (target: number) =>
      allGrinders().filter((g) => !micronsToSetting(g, target).clamped);

    expect(reaches(300).length, 'no grinder can hit espresso').toBeGreaterThan(0);
    expect(reaches(800).length, 'no grinder can hit pour-over').toBeGreaterThan(0);
  });

  it('has usable dial resolution — no single-detent grinders', () => {
    for (const g of allGrinders()) {
      expect(settingSteps(g).length, `${g.id} has too few positions`).toBeGreaterThan(4);
    }
  });
});

describe('lookup', () => {
  it('finds a grinder by id', () => {
    const first = allGrinders()[0]!;
    expect(grinderById(first.id)).toBe(first);
    expect(grinderById('nope')).toBeUndefined();
  });

  it('joins brand and model for display', () => {
    expect(displayName({ brand: 'Acme', model: 'X1' } as never)).toBe('Acme X1');
  });
});

describe('searchGrinders', () => {
  it('returns everything for an empty query', () => {
    expect(searchGrinders('   ')).toHaveLength(allGrinders().length);
  });

  it('requires every term to match', () => {
    const hits = searchGrinders('1zpresso jx');
    expect(hits.length).toBeGreaterThan(0);
    for (const g of hits) {
      expect(g.brand.toLowerCase()).toContain('1zpresso');
      expect(g.model.toLowerCase()).toContain('jx');
    }
  });

  it('matches aliases as well as model names', () => {
    // The C40 lists "MK3" as an alias even though the model string says MK4.
    const hits = searchGrinders('mk3');
    expect(hits.map((g) => g.id)).toContain('comandante-c40-mk4');
  });

  it('is case-insensitive', () => {
    expect(searchGrinders('COMANDANTE').length).toBe(searchGrinders('comandante').length);
  });
});

describe('groupByBrand', () => {
  it('groups and sorts alphabetically without losing entries', () => {
    const groups = groupByBrand(allGrinders());
    const brands = groups.map(([brand]) => brand);

    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b)));
    expect(groups.flatMap(([, list]) => list)).toHaveLength(allGrinders().length);
    expect(new Set(brands).size).toBe(brands.length);
  });
});
