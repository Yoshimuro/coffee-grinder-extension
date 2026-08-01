#!/usr/bin/env node
/**
 * Derives calibrations from the beeancoffee grind converter and writes them as
 * the CSV `import-csv.mjs` expects.
 *
 *   node scripts/beeancoffee-harvest.mjs --out bc.csv
 *   node scripts/import-csv.mjs bc.csv beeancoffee --source https://converter.beeancoffee.com/
 *
 * That service converts a setting on one grinder to the equivalent on another
 * but never states a particle size. A micron scale is recovered by sweeping a
 * *reference* grinder whose step we know and reading off what the target says:
 * the reference supplies the microns, the service supplies the correspondence.
 *
 * The reference has to be a grinder whose published step is confirmed by an
 * independent measurement, or its error is baked into every entry harvested
 * through it. The default is the Timemore Chestnut C2 — Timemore publishes
 * 33 um per click, and a sieve run against a micron-dialled grinder agrees to
 * within 1% over 55 readings. The Comandante C40 was the other candidate and
 * was rejected: its published 30 um sits ~9% coarse against the same sieve run.
 *
 * The service extrapolates past the ends of a dial rather than clamping — ask
 * for something finer than the grinder reaches and it answers with a negative
 * click — so readings outside the grinder's own range are discarded, not
 * trusted.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    flags.set(argv[i].slice(2), argv[i + 1]?.startsWith('--') ? true : argv[i + 1]);
    if (!argv[i + 1]?.startsWith('--')) i += 1;
  }
}

const API = 'https://converter.beeancoffee.com/api/widget/v1';
const HEADERS = {
  'content-type': 'application/json',
  // The endpoint is origin-checked; it is the widget's own host.
  origin: 'https://converter.beeancoffee.com',
  referer: 'https://converter.beeancoffee.com/',
};

const REFERENCE = flags.get('reference') ?? 'timemore_chestnut_c2';
const REFERENCE_STEP = Number(flags.get('reference-step') ?? 33);
const DELAY = Number(flags.get('delay') ?? 150);
const outFile = resolve(flags.get('out') ?? 'beeancoffee.csv');

/**
 * Makes whose numbers disagree with both the manufacturer and the sieve data,
 * and disagree in opposite directions, so there is no consistent scale to put
 * them on alongside the entries already in the catalogue.
 */
const UNTRUSTED_MAKE = /^1Zpresso$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(API + path, { headers: HEADERS, ...init });
      if (response.status === 429) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!response.ok) return undefined;
      return await response.json();
    } catch {
      await sleep(800 * attempt);
    }
  }
  return undefined;
}

const convert = (from, to, sourceSettings) => api('/convert', {
  method: 'POST',
  body: JSON.stringify({ sourceGrinderId: from, targetGrinderId: to, sourceSettings }),
});

/**
 * A {rotation, number, click} reading as one position on the grinder's own
 * dial, using the maxima the catalogue declares for each unit.
 *
 * @param {{units: Array<{label: string, maximum: number}>}} grinder
 * @param {Record<string, number> | number[]} reading
 */
function flatten(grinder, reading) {
  const max = Object.fromEntries(grinder.units.map((u) => [u.label, u.maximum]));
  const value = Array.isArray(reading)
    ? Object.fromEntries(grinder.units.map((u, i) => [u.label, reading[i] ?? 0]))
    : reading;
  const rotation = value.rotation ?? 0;
  const number = value.number ?? 0;
  const click = value.click ?? 0;

  if (max.rotation !== undefined) return (rotation * (max.number + 1) + number) * (max.click + 1) + click;
  // A dial numbered 0-9 with ten clicks between numbers reads as a decimal —
  // "4.8" is what is printed on the grinder, so keep it that way.
  if (max.number !== undefined) return max.click === 9 ? number + click / 10 : number * (max.click + 1) + click;
  return click;
}

/** Least-squares fit of microns = intercept + slope * setting. */
function fit(points) {
  const n = points.length;
  const sx = points.reduce((a, p) => a + p.setting, 0);
  const sy = points.reduce((a, p) => a + p.microns, 0);
  const sxx = points.reduce((a, p) => a + p.setting * p.setting, 0);
  const sxy = points.reduce((a, p) => a + p.setting * p.microns, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const worst = Math.max(...points.map((p) => Math.abs(intercept + slope * p.setting - p.microns) / p.microns));
  return { slope, intercept, worst };
}

// ---------------------------------------------------------------------- main

const catalogue = await api('/grinders');
if (!Array.isArray(catalogue)) {
  console.error('Could not read the grinder list.');
  process.exit(1);
}

const reference = catalogue.find((g) => g.id === REFERENCE);
if (!reference) {
  console.error(`Reference "${REFERENCE}" is not in the service's catalogue.`);
  process.exit(1);
}

const skipIds = new Set((flags.get('skip') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const targets = catalogue.filter((g) => g.id !== REFERENCE && !skipIds.has(g.id));

const rows = [['brand', 'model', 'type', 'burr', 'min', 'max', 'step', 'unit', 'microns_per_step', 'zero_offset', 'anchors', 'confidence', 'note']];
const skipped = [];

const refMax = reference.range?.grinder?.end?.[0] ?? reference.units[0].maximum;
const samples = [];
for (let i = 0; i <= 11; i += 1) samples.push(Math.round((refMax * (i + 1)) / 13));

for (const grinder of targets) {
  if (UNTRUSTED_MAKE.test(grinder.make)) {
    skipped.push(`${grinder.name}: ${grinder.make} readings disagree with both the manufacturer and the sieve data`);
    continue;
  }

  const lo = flatten(grinder, grinder.range?.grinder?.start ?? []);
  const hi = flatten(grinder, grinder.range?.grinder?.end ?? []);
  const points = [];

  for (const click of samples) {
    const answer = await convert(REFERENCE, grinder.id, { rotation: 0, number: 0, click });
    await sleep(DELAY);
    if (!answer) continue;
    const setting = flatten(grinder, answer);
    // The service extrapolates past both ends of the dial; only readings the
    // grinder can actually be set to say anything about it.
    if (setting < lo || setting > hi) continue;
    points.push({ setting, microns: click * REFERENCE_STEP });
  }

  const unique = [...new Map(points.map((p) => [p.setting, p])).values()].sort((a, b) => a.setting - b.setting);
  if (unique.length < 4) {
    skipped.push(`${grinder.name}: only ${unique.length} in-range reading(s)`);
    continue;
  }

  const { slope, intercept, worst } = fit(unique);
  if (!(slope > 0)) {
    skipped.push(`${grinder.name}: fitted step is not positive`);
    continue;
  }

  const decimal = grinder.units.length === 2 && grinder.units[1].maximum === 9;
  const linear = worst < 0.03;

  // A sweep of the reference does not reach both ends of every target dial, so
  // the scale is narrowed to the stretch actually measured. Leaving the full
  // dial in place and letting the fit extrapolate is what produced a grinder
  // reading -126 um at zero and another topping out past 3000 um: outside the
  // sampled span the line has nothing holding it down.
  const min = unique[0].setting;
  const max = unique[unique.length - 1].setting;

  rows.push([
    grinder.make,
    grinder.model || grinder.name,
    /grinder|hand|manual|porlex|mini mill|aergrind|helor/i.test(grinder.name) || grinder.tier === 'Manual' ? 'manual' : 'electric',
    'conical',
    String(min),
    String(max),
    decimal ? '0.1' : '1',
    decimal ? 'mark' : 'click',
    linear ? slope.toFixed(2) : '',
    linear ? Math.round(intercept) : '',
    linear ? '' : unique.map((p) => `${p.setting}:${Math.round(p.microns)}`).join('; '),
    'community',
    `Derived by converting from a ${reference.name} at ${REFERENCE_STEP} um per click; the service states correspondences, not particle sizes.`
    + (linear ? '' : ` Fit was non-linear (worst residual ${(worst * 100).toFixed(0)}%), so measured points are kept as anchors.`),
  ]);

  console.error(`${grinder.name}: ${unique.length} points, ${slope.toFixed(1)} um/step${linear ? '' : ' (anchors)'}`);
}

const csv = rows
  .map((row) => row.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
  .join('\n');
writeFileSync(outFile, `${csv}\n`);

console.error(`\n${rows.length - 1} grinder(s) -> ${outFile}`);
if (skipped.length > 0) {
  console.error(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.error(`  - ${s}`);
}
