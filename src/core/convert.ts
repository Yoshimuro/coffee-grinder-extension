import {
  CONFIDENCE_TOLERANCE,
  type BrewMethod,
  type Grinder,
} from './types.js';

/** A setting mapped back onto a grinder's dial. */
export interface SettingResult {
  /** Exact real-valued setting before snapping to the dial's increments. */
  exact: number;
  /** `exact` snapped to the nearest increment the user can actually select. */
  snapped: number;
  /** True when the ideal setting lies outside the grinder's range. */
  clamped: boolean;
}

export interface ConversionResult {
  microns: number;
  target: SettingResult;
  /**
   * Plausible span on the target dial, given how much we trust both grinders.
   * Always brackets `target.snapped`.
   */
  band: { low: number; high: number };
  /** Microns per increment on the target — the finest step it can resolve. */
  resolutionMicrons: number;
  /** Brew methods whose recommended range contains `microns`. */
  methods: BrewMethod[];
}

const EPSILON = 1e-9;

/** Particle size, in microns, produced by `grinder` at `setting`. */
export function settingToMicrons(grinder: Grinder, setting: number): number {
  const cal = grinder.calibration;
  if (cal.kind === 'linear') {
    return cal.zeroOffsetMicrons + setting * cal.micronsPerStep;
  }
  return interpolate(cal.points, setting, 'setting', 'microns');
}

/** Inverse of {@link settingToMicrons}, snapped onto the grinder's increments. */
export function micronsToSetting(grinder: Grinder, microns: number): SettingResult {
  const cal = grinder.calibration;

  let exact: number;
  if (cal.kind === 'linear') {
    exact = (microns - cal.zeroOffsetMicrons) / cal.micronsPerStep;
  } else {
    exact = interpolate(cal.points, microns, 'microns', 'setting');
  }

  const { min, max, step } = grinder.scale;
  const clamped = exact < min - EPSILON || exact > max + EPSILON;
  const bounded = clamp(exact, min, max);

  // Snap onto the grid the dial actually offers, anchored at `min` because a
  // scale may start somewhere other than zero.
  const snapped = clamp(min + Math.round((bounded - min) / step) * step, min, max);

  return { exact, snapped: roundTo(snapped, 4), clamped };
}

/** Convert a setting on `from` to the equivalent setting on `to`. */
export function convert(
  from: Grinder,
  fromSetting: number,
  to: Grinder,
  methods: BrewMethod[] = [],
): ConversionResult {
  const microns = settingToMicrons(from, fromSetting);
  const target = micronsToSetting(to, microns);

  // Errors in the two calibrations are independent, so combine in quadrature
  // rather than summing — summing would overstate the band badly for two
  // manufacturer-grade entries.
  const tolerance = Math.hypot(
    CONFIDENCE_TOLERANCE[from.confidence],
    CONFIDENCE_TOLERANCE[to.confidence],
  );

  const lowEdge = micronsToSetting(to, microns * (1 - tolerance)).snapped;
  const highEdge = micronsToSetting(to, microns * (1 + tolerance)).snapped;

  // A coarser dial can map both edges onto the same detent; keep the band
  // inclusive of the answer regardless of direction.
  const band = {
    low: Math.min(lowEdge, highEdge, target.snapped),
    high: Math.max(lowEdge, highEdge, target.snapped),
  };

  return {
    microns: roundTo(microns, 1),
    target,
    band,
    resolutionMicrons: roundTo(resolutionMicrons(to, target.snapped), 1),
    methods: methodsFor(methods, microns),
  };
}

/** Width in microns of one increment on `grinder` near `setting`. */
export function resolutionMicrons(grinder: Grinder, setting: number): number {
  const { step, min, max } = grinder.scale;
  const lo = clamp(setting - step / 2, min - step, max + step);
  const hi = lo + step;
  return Math.abs(settingToMicrons(grinder, hi) - settingToMicrons(grinder, lo));
}

/** Brew methods whose recommended range contains `microns`. */
export function methodsFor(methods: BrewMethod[], microns: number): BrewMethod[] {
  return methods.filter((m) => microns >= m.min && microns <= m.max);
}

/**
 * Render a setting the way the grinder's own dial reads it. Rotation-based
 * grinders (1Zpresso and friends) are marked "rotations.clicks"; everything
 * else is a plain number.
 */
export function formatSetting(grinder: Grinder, setting: number): string {
  const perRotation = grinder.scale.clicksPerRotation;
  if (perRotation && perRotation > 0 && setting >= perRotation) {
    const rotations = Math.floor(setting / perRotation);
    const clicks = roundTo(setting - rotations * perRotation, 2);
    return `${rotations}.${clicks}`;
  }
  return String(roundTo(setting, 2));
}

/** Every setting the dial offers, low to high. Drives the UI's stepper. */
export function settingSteps(grinder: Grinder): number[] {
  const { min, max, step } = grinder.scale;
  const out: number[] = [];
  for (let i = 0; min + i * step <= max + EPSILON; i += 1) {
    out.push(roundTo(min + i * step, 4));
  }
  return out;
}

/**
 * Piecewise-linear interpolation over `points`, keyed on `xKey` and read out on
 * `yKey`. Outside the anchor range the outermost segment is extended, so a dial
 * still converts past its measured points instead of dead-ending.
 *
 * `points` must be sorted ascending and strictly monotonic in both fields —
 * enforced by the dataset build, so this can assume it.
 */
function interpolate<K extends 'setting' | 'microns'>(
  points: ReadonlyArray<Record<'setting' | 'microns', number>>,
  x: number,
  xKey: K,
  yKey: 'setting' | 'microns',
): number {
  if (points.length === 0) throw new Error('calibration has no anchor points');
  if (points.length === 1) return points[0]![yKey];

  const first = points[0]!;
  const last = points[points.length - 1]!;

  if (x <= first[xKey]) return extend(first, points[1]!, x, xKey, yKey);
  if (x >= last[xKey]) {
    return extend(points[points.length - 2]!, last, x, xKey, yKey);
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (x >= a[xKey] && x <= b[xKey]) return extend(a, b, x, xKey, yKey);
  }

  return last[yKey];
}

function extend(
  a: Record<'setting' | 'microns', number>,
  b: Record<'setting' | 'microns', number>,
  x: number,
  xKey: 'setting' | 'microns',
  yKey: 'setting' | 'microns',
): number {
  const run = b[xKey] - a[xKey];
  if (Math.abs(run) < EPSILON) return a[yKey];
  return a[yKey] + ((x - a[xKey]) / run) * (b[yKey] - a[yKey]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
