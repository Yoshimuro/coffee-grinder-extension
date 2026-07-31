#!/usr/bin/env node
/**
 * Validates the hand-maintained grinder data and emits the bundle the extension
 * ships with.
 *
 *   node scripts/build-dataset.mjs           # write src/generated/dataset.json
 *   node scripts/build-dataset.mjs --check   # fail if the committed bundle is stale
 *
 * Validation goes past "is this valid JSON": calibrations must be strictly
 * monotonic, because the converter inverts them. A non-monotonic curve would
 * make `microns -> setting` ambiguous and silently return nonsense.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const GRINDER_DIR = join(DATA_DIR, 'grinders');
const OUT_FILE = join(ROOT, 'src', 'generated', 'dataset.json');

const CONFIDENCE = new Set(['manufacturer', 'community', 'estimated']);
const UNITS = new Set(['click', 'number', 'mark']);
const TYPES = new Set(['manual', 'electric']);

const errors = [];
const seenIds = new Map();

function fail(where, message) {
  errors.push(`${where}: ${message}`);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(path, `unreadable JSON — ${err.message}`);
    return null;
  }
}

function validateGrinder(g, where) {
  for (const field of ['id', 'brand', 'model', 'burr']) {
    if (typeof g[field] !== 'string' || g[field].trim() === '') {
      fail(where, `"${field}" must be a non-empty string`);
    }
  }
  if (!TYPES.has(g.type)) fail(where, `"type" must be one of ${[...TYPES].join(', ')}`);
  if (!CONFIDENCE.has(g.confidence)) {
    fail(where, `"confidence" must be one of ${[...CONFIDENCE].join(', ')}`);
  }
  if (!Array.isArray(g.sources) || g.sources.length === 0) {
    fail(where, '"sources" must list at least one URL — uncited entries are not accepted');
  }

  if (typeof g.id === 'string') {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.id)) {
      fail(where, `id "${g.id}" must be a lowercase kebab-case slug`);
    }
    if (seenIds.has(g.id)) {
      fail(where, `duplicate id "${g.id}", already defined in ${seenIds.get(g.id)}`);
    } else {
      seenIds.set(g.id, where);
    }
  }

  const s = g.scale;
  if (!s || typeof s !== 'object') {
    fail(where, 'missing "scale"');
  } else {
    for (const field of ['min', 'max', 'step']) {
      if (typeof s[field] !== 'number' || !Number.isFinite(s[field])) {
        fail(where, `scale.${field} must be a finite number`);
      }
    }
    if (!UNITS.has(s.unit)) fail(where, `scale.unit must be one of ${[...UNITS].join(', ')}`);
    if (s.max <= s.min) fail(where, 'scale.max must be greater than scale.min');
    if (s.step <= 0) fail(where, 'scale.step must be positive');
    if (s.step > s.max - s.min) fail(where, 'scale.step is larger than the whole range');
  }

  const cal = g.calibration;
  if (!cal || typeof cal !== 'object') {
    fail(where, 'missing "calibration"');
    return;
  }

  if (cal.kind === 'linear') {
    if (typeof cal.micronsPerStep !== 'number' || cal.micronsPerStep <= 0) {
      fail(where, 'calibration.micronsPerStep must be a positive number');
    }
    if (typeof cal.zeroOffsetMicrons !== 'number') {
      fail(where, 'calibration.zeroOffsetMicrons must be a number (use 0 for burr-contact zero)');
    }
  } else if (cal.kind === 'anchors') {
    const pts = cal.points;
    if (!Array.isArray(pts) || pts.length < 2) {
      fail(where, 'calibration.points needs at least two anchors');
      return;
    }
    for (const [i, p] of pts.entries()) {
      if (typeof p?.setting !== 'number' || typeof p?.microns !== 'number') {
        fail(where, `anchor ${i} must have numeric "setting" and "microns"`);
      }
    }
    // Strict monotonicity in both axes keeps the mapping invertible.
    for (let i = 1; i < pts.length; i += 1) {
      if (pts[i].setting <= pts[i - 1].setting) {
        fail(where, `anchors must be sorted by ascending setting (index ${i})`);
      }
      if (pts[i].microns <= pts[i - 1].microns) {
        fail(where, `microns must strictly increase with setting (index ${i}) — otherwise the conversion cannot be inverted`);
      }
    }
    if (g.scale) {
      const first = pts[0].setting;
      const last = pts[pts.length - 1].setting;
      if (first > g.scale.min || last < g.scale.max) {
        fail(
          where,
          `anchors span ${first}..${last} but the scale is ${g.scale.min}..${g.scale.max}; extend the anchors so the dial is fully covered`,
        );
      }
    }
  } else {
    fail(where, `unknown calibration.kind "${cal.kind}"`);
  }
}

function validateMethod(m, where) {
  if (typeof m.id !== 'string' || typeof m.name !== 'string') {
    fail(where, 'method needs string "id" and "name"');
  }
  if (typeof m.min !== 'number' || typeof m.max !== 'number' || m.max <= m.min) {
    fail(where, 'method needs numeric min < max');
  }
}

// ---------------------------------------------------------------- load & check

const meta = readJson(join(DATA_DIR, 'dataset.meta.json')) ?? {};
if (typeof meta.version !== 'number') fail('dataset.meta.json', '"version" must be a number');
if (typeof meta.updated !== 'string') fail('dataset.meta.json', '"updated" must be an ISO date string');

const grinders = [];
const files = existsSync(GRINDER_DIR)
  ? readdirSync(GRINDER_DIR).filter((f) => f.endsWith('.json')).sort()
  : [];

if (files.length === 0) fail('data/grinders', 'no grinder files found');

for (const file of files) {
  const entries = readJson(join(GRINDER_DIR, file));
  if (!Array.isArray(entries)) {
    fail(`data/grinders/${file}`, 'must contain a top-level array of grinders');
    continue;
  }
  for (const [i, g] of entries.entries()) {
    validateGrinder(g, `data/grinders/${file}[${i}] ${g?.id ?? '<no id>'}`);
    grinders.push(g);
  }
}

const methodsDoc = readJson(join(DATA_DIR, 'methods.json')) ?? {};
const methods = Array.isArray(methodsDoc.methods) ? methodsDoc.methods : [];
if (methods.length === 0) fail('data/methods.json', 'no brew methods found');
for (const [i, m] of methods.entries()) validateMethod(m, `data/methods.json[${i}]`);

if (errors.length > 0) {
  console.error(`\nDataset validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

// ---------------------------------------------------------------------- emit

// Sorted so the output is stable regardless of file order or edit history.
grinders.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));

const bundle = {
  version: meta.version,
  generatedAt: meta.updated,
  grinders,
  methods,
};

const json = JSON.stringify(bundle);
const gzipped = gzipSync(Buffer.from(json), { level: 9 }).length;

const checkOnly = process.argv.includes('--check');
const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null;

if (checkOnly) {
  if (current !== json) {
    console.error(
      '\nsrc/generated/dataset.json is out of date with data/.\nRun `npm run build:data` and commit the result.\n',
    );
    process.exit(1);
  }
  console.log(`Dataset up to date — ${grinders.length} grinders, ${methods.length} methods.`);
} else {
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, json);
  console.log(`Wrote src/generated/dataset.json`);
}

const byConfidence = grinders.reduce((acc, g) => {
  acc[g.confidence] = (acc[g.confidence] ?? 0) + 1;
  return acc;
}, {});

console.log('');
console.log(`  grinders        ${grinders.length}`);
console.log(`  brew methods    ${methods.length}`);
console.log(`  confidence      ${Object.entries(byConfidence).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`  raw JSON        ${fmt(json.length)}`);
console.log(`  gzipped         ${fmt(gzipped)}`);
console.log(`  per grinder     ${fmt(Math.round(json.length / grinders.length))} raw`);
console.log(
  `  projected 1000  ${fmt(Math.round((json.length / grinders.length) * 1000))} raw, ` +
    `${fmt(Math.round((gzipped / grinders.length) * 1000))} gzipped`,
);
console.log('');

function fmt(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
