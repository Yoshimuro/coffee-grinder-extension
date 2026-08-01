/**
 * Domain types for the grinder converter.
 *
 * The whole model rests on one idea: a grinder setting is not comparable across
 * machines, but the particle size it produces is. So every conversion goes
 * `setting -> microns -> setting`, and microns are the interchange format.
 */

/** How a grinder's dial maps onto microns. */
export type Calibration =
  /**
   * Burr gap moves a fixed distance per click. Typical for hand grinders with a
   * published "microns per click" figure, zeroed at the burr contact point.
   *
   *   microns = zeroOffsetMicrons + setting * micronsPerStep
   */
  | { kind: 'linear'; micronsPerStep: number; zeroOffsetMicrons: number }
  /**
   * An arbitrary dial (Encore 1-40, Ode 1-11) with no meaningful zero. Measured
   * reference points are interpolated piecewise-linearly, and extrapolated from
   * the outermost pair beyond the ends.
   */
  | { kind: 'anchors'; points: AnchorPoint[] };

export interface AnchorPoint {
  /** Position on the grinder's own dial. */
  setting: number;
  /** Median particle size produced there. */
  microns: number;
}

/**
 * How much we trust an entry. Surfaced in the UI, and widens the uncertainty
 * band on every conversion that touches the grinder.
 */
export type Confidence = 'manufacturer' | 'community' | 'estimated';

/** Relative error assumed for each confidence tier, as a fraction of the value. */
export const CONFIDENCE_TOLERANCE: Record<Confidence, number> = {
  manufacturer: 0.05,
  community: 0.12,
  estimated: 0.25,
};

export interface GrinderScale {
  /** Lowest selectable setting (usually 0 = burrs touching). */
  min: number;
  /** Highest selectable setting. */
  max: number;
  /** Smallest increment the user can actually dial in. */
  step: number;
  /** What one unit on the dial is called, for display. */
  unit: 'click' | 'number' | 'mark';
  /**
   * For grinders dialled as "rotations + clicks" (most 1Zpresso). Presentation
   * only — settings are always stored and computed as a flat click count.
   */
  clicksPerRotation?: number;
}

export interface Grinder {
  /** Stable slug, e.g. `1zpresso-jx-pro`. Never reused for a different model. */
  id: string;
  brand: string;
  model: string;
  type: 'manual' | 'electric';
  /** Free text — "conical", "flat", "ceramic conical", …. Display only. */
  burr: string;
  scale: GrinderScale;
  calibration: Calibration;
  confidence: Confidence;
  /** URLs backing the numbers above. Required — no uncited entries. */
  sources: string[];
  /** Extra search terms (former names, common abbreviations). */
  aliases?: string[];
  /** Anything a user needs to know to reproduce the numbers. */
  note?: string;
}

export interface BrewMethod {
  id: string;
  name: string;
  /** Inclusive micron range generally recommended for the method. */
  min: number;
  max: number;
}

export interface Dataset {
  /** Bumped whenever the data changes; used to decide if a remote feed is newer. */
  version: number;
  /** ISO date the bundle was generated. */
  generatedAt: string;
  grinders: Grinder[];
  methods: BrewMethod[];
}
