import { describe, expect, it } from 'vitest';
import {
  convert,
  formatSetting,
  micronsToSetting,
  resolutionMicrons,
  settingSteps,
  settingToMicrons,
} from '../../src/convert.js';
import type { Grinder } from '../../src/types.js';

const linear = (over: Partial<Grinder> = {}): Grinder => ({
  id: 'test-linear',
  brand: 'Test',
  model: 'Linear',
  type: 'manual',
  burr: 'conical',
  scale: { min: 0, max: 100, step: 1, unit: 'click' },
  calibration: { kind: 'linear', micronsPerStep: 10, zeroOffsetMicrons: 0 },
  confidence: 'manufacturer',
  sources: ['test'],
  ...over,
});

const anchored = (over: Partial<Grinder> = {}): Grinder => ({
  id: 'test-anchored',
  brand: 'Test',
  model: 'Anchored',
  type: 'electric',
  burr: 'flat',
  scale: { min: 1, max: 11, step: 1, unit: 'number' },
  calibration: {
    kind: 'anchors',
    points: [
      { setting: 1, microns: 300 },
      { setting: 6, microns: 800 },
      { setting: 11, microns: 1300 },
    ],
  },
  confidence: 'manufacturer',
  sources: ['test'],
  ...over,
});

describe('settingToMicrons', () => {
  it('scales linearly from the zero offset', () => {
    expect(settingToMicrons(linear(), 0)).toBe(0);
    expect(settingToMicrons(linear(), 24)).toBe(240);
  });

  it('honours a non-zero offset for grinders that do not zero at burr contact', () => {
    const g = linear({ calibration: { kind: 'linear', micronsPerStep: 10, zeroOffsetMicrons: 150 } });
    expect(settingToMicrons(g, 0)).toBe(150);
    expect(settingToMicrons(g, 10)).toBe(250);
  });

  it('interpolates between anchor points', () => {
    expect(settingToMicrons(anchored(), 1)).toBe(300);
    expect(settingToMicrons(anchored(), 6)).toBe(800);
    expect(settingToMicrons(anchored(), 3.5)).toBe(550);
  });

  it('extrapolates along the outer segment past the anchors', () => {
    // Beyond the last anchor the final segment's slope (100 um per step)
    // continues, rather than flattening out and hiding the extrapolation.
    expect(settingToMicrons(anchored(), 13)).toBe(1500);
    expect(settingToMicrons(anchored(), -1)).toBe(100);
  });
});

describe('micronsToSetting', () => {
  it('inverts the linear mapping', () => {
    expect(micronsToSetting(linear(), 240).snapped).toBe(24);
  });

  it('inverts the anchored mapping', () => {
    expect(micronsToSetting(anchored(), 550).snapped).toBe(4);
    expect(micronsToSetting(anchored(), 800).snapped).toBe(6);
  });

  it('snaps onto the dial increments rather than reporting false precision', () => {
    const quarter = anchored({ scale: { min: 1, max: 11, step: 0.25, unit: 'number' } });
    expect(micronsToSetting(quarter, 570).snapped).toBe(3.75);
    // The same request on a whole-number dial rounds to the nearest detent.
    expect(micronsToSetting(anchored(), 570).snapped).toBe(4);
  });

  it('anchors the snap grid to scale.min, not to zero', () => {
    // A dial running 1..11 in steps of 0.25 offers 1.00, 1.25, ... never 1.10.
    const quarter = anchored({ scale: { min: 1, max: 11, step: 0.25, unit: 'number' } });
    for (const microns of [310, 425, 690, 1180]) {
      const { snapped } = micronsToSetting(quarter, microns);
      expect(Number.isInteger((snapped - 1) / 0.25)).toBe(true);
    }
  });

  it('clamps out-of-range requests and says so', () => {
    const tooCoarse = micronsToSetting(linear(), 5000);
    expect(tooCoarse.snapped).toBe(100);
    expect(tooCoarse.clamped).toBe(true);

    const inRange = micronsToSetting(linear(), 500);
    expect(inRange.clamped).toBe(false);
  });

  it('round-trips every reachable setting', () => {
    for (const g of [linear(), anchored()]) {
      for (const setting of settingSteps(g)) {
        expect(micronsToSetting(g, settingToMicrons(g, setting)).snapped).toBeCloseTo(setting, 6);
      }
    }
  });
});

describe('convert', () => {
  it('maps a setting through microns onto the target dial', () => {
    const from = linear({ id: 'a', calibration: { kind: 'linear', micronsPerStep: 12.5, zeroOffsetMicrons: 0 } });
    const to = linear({ id: 'b', calibration: { kind: 'linear', micronsPerStep: 30, zeroOffsetMicrons: 0 } });

    const result = convert(from, 24, to);
    expect(result.microns).toBe(300);
    expect(result.target.snapped).toBe(10);
  });

  it('reports the target resolution so the user knows how coarse the answer is', () => {
    const from = linear({ id: 'a', calibration: { kind: 'linear', micronsPerStep: 12.5, zeroOffsetMicrons: 0 } });
    const to = linear({ id: 'b', calibration: { kind: 'linear', micronsPerStep: 30, zeroOffsetMicrons: 0 } });
    expect(convert(from, 24, to).resolutionMicrons).toBe(30);
  });

  it('always brackets the answer with the uncertainty band', () => {
    const from = linear({ id: 'a' });
    const to = linear({ id: 'b', calibration: { kind: 'linear', micronsPerStep: 3, zeroOffsetMicrons: 0 } });

    const result = convert(from, 50, to);
    expect(result.band.low).toBeLessThanOrEqual(result.target.snapped);
    expect(result.band.high).toBeGreaterThanOrEqual(result.target.snapped);
  });

  it('widens the band when either grinder is less trustworthy', () => {
    const from = linear({ id: 'a' });
    const precise = linear({ id: 'b', confidence: 'manufacturer' });
    const guessed = linear({ id: 'c', confidence: 'estimated' });

    const tight = convert(from, 50, precise);
    const loose = convert(from, 50, guessed);

    expect(loose.band.high - loose.band.low).toBeGreaterThan(tight.band.high - tight.band.low);
  });

  it('is symmetric — converting back returns the original setting', () => {
    const a = linear({ id: 'a', calibration: { kind: 'linear', micronsPerStep: 12.5, zeroOffsetMicrons: 0 } });
    const b = linear({ id: 'b', calibration: { kind: 'linear', micronsPerStep: 25, zeroOffsetMicrons: 0 } });

    const there = convert(a, 40, b).target.snapped;
    expect(convert(b, there, a).target.snapped).toBe(40);
  });

  it('tags the result with every matching brew method', () => {
    const methods = [
      { id: 'espresso', name: 'Espresso', min: 180, max: 380 },
      { id: 'pourover', name: 'Pour-over', min: 410, max: 930 },
    ];
    const g = linear();
    expect(convert(g, 30, g, methods).methods.map((m) => m.id)).toEqual(['espresso']);
    expect(convert(g, 60, g, methods).methods.map((m) => m.id)).toEqual(['pourover']);
    expect(convert(g, 40, g, methods).methods).toEqual([]);
  });
});

describe('resolutionMicrons', () => {
  it('reflects the local slope of an anchored curve', () => {
    const kinked = anchored({
      calibration: {
        kind: 'anchors',
        points: [
          { setting: 1, microns: 200 },
          { setting: 6, microns: 300 },
          { setting: 11, microns: 1300 },
        ],
      },
    });
    // 20 um per step in the fine segment, 200 um per step in the coarse one.
    expect(resolutionMicrons(kinked, 3)).toBeCloseTo(20, 6);
    expect(resolutionMicrons(kinked, 9)).toBeCloseTo(200, 6);
  });
});

describe('formatSetting', () => {
  it('reads rotation-based dials as rotations.clicks', () => {
    const g = linear({ scale: { min: 0, max: 200, step: 1, unit: 'click', clicksPerRotation: 40 } });
    expect(formatSetting(g, 24)).toBe('24');
    expect(formatSetting(g, 40)).toBe('1.0');
    expect(formatSetting(g, 95)).toBe('2.15');
  });

  it('leaves plain dials alone', () => {
    expect(formatSetting(linear(), 24)).toBe('24');
    expect(formatSetting(anchored(), 3.5)).toBe('3.5');
  });
});

describe('settingSteps', () => {
  it('enumerates exactly the selectable positions', () => {
    expect(settingSteps(linear({ scale: { min: 0, max: 3, step: 1, unit: 'click' } }))).toEqual([0, 1, 2, 3]);
    expect(settingSteps(linear({ scale: { min: 1, max: 2, step: 0.25, unit: 'number' } }))).toEqual([
      1, 1.25, 1.5, 1.75, 2,
    ]);
  });
});
