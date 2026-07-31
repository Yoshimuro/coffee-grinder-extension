#!/usr/bin/env node
/**
 * Turns a CSV of grinder calibrations into a `data/grinders/*.json` file.
 *
 *   node scripts/import-csv.mjs <input.csv> <output-name> --source <url>
 *   node scripts/import-csv.mjs sacred-grind.csv theweldercatherine --source https://…
 *
 * This is how the catalogue grows past the hand-written seed. Point it at any
 * spreadsheet you have rights to use, map the columns, and the output drops
 * straight into the validated build.
 *
 * Expected columns (header row, case-insensitive, extra columns ignored):
 *
 *   brand, model, type, burr, min, max, step, unit
 *   microns_per_step, zero_offset          -- for a linear calibration
 *   anchors                                -- or "setting:microns; setting:microns; …"
 *   clicks_per_rotation, confidence, aliases, note
 *
 * Give either microns_per_step or anchors, not both. Rows missing both are
 * reported and skipped rather than guessed at.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    flags.set(argv[i].slice(2), argv[i + 1]);
    i += 1;
  } else {
    positional.push(argv[i]);
  }
}

const [input, outputName] = positional;
if (!input || !outputName) {
  console.error('usage: node scripts/import-csv.mjs <input.csv> <output-name> --source <url>');
  process.exit(2);
}

const defaultSource = flags.get('source');
if (!defaultSource) {
  console.error('--source <url> is required: every entry must be attributable.');
  process.exit(2);
}

/** Minimal RFC 4180 parser — handles quoted fields, embedded commas, "" escapes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function num(value) {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const rows = parseCsv(readFileSync(resolve(input), 'utf8'));
if (rows.length < 2) {
  console.error('CSV has no data rows.');
  process.exit(1);
}

const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
const get = (row, name) => {
  const idx = header.indexOf(name);
  return idx === -1 ? undefined : row[idx]?.trim();
};

const grinders = [];
const skipped = [];

for (const [i, row] of rows.slice(1).entries()) {
  const line = i + 2;
  const brand = get(row, 'brand');
  const model = get(row, 'model');

  if (!brand || !model) {
    skipped.push(`line ${line}: missing brand or model`);
    continue;
  }

  const micronsPerStep = num(get(row, 'microns_per_step'));
  const anchorsRaw = get(row, 'anchors');

  let calibration;
  if (micronsPerStep !== undefined && anchorsRaw) {
    skipped.push(`line ${line} (${brand} ${model}): both microns_per_step and anchors given`);
    continue;
  } else if (micronsPerStep !== undefined) {
    calibration = {
      kind: 'linear',
      micronsPerStep,
      zeroOffsetMicrons: num(get(row, 'zero_offset')) ?? 0,
    };
  } else if (anchorsRaw) {
    const points = anchorsRaw
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [setting, microns] = pair.split(':').map((v) => Number(v.trim()));
        return { setting, microns };
      });

    if (points.length < 2 || points.some((p) => !Number.isFinite(p.setting) || !Number.isFinite(p.microns))) {
      skipped.push(`line ${line} (${brand} ${model}): anchors must be "setting:microns; …" with 2+ valid pairs`);
      continue;
    }
    points.sort((a, b) => a.setting - b.setting);
    calibration = { kind: 'anchors', points };
  } else {
    skipped.push(`line ${line} (${brand} ${model}): no microns_per_step and no anchors`);
    continue;
  }

  const aliases = (get(row, 'aliases') ?? '')
    .split(/[;|]/)
    .map((a) => a.trim())
    .filter(Boolean);

  const scale = {
    min: num(get(row, 'min')) ?? 0,
    max: num(get(row, 'max')) ?? 0,
    step: num(get(row, 'step')) ?? 1,
    unit: get(row, 'unit') || 'click',
  };
  const perRotation = num(get(row, 'clicks_per_rotation'));
  if (perRotation !== undefined) scale.clicksPerRotation = perRotation;

  const entry = {
    id: slug(`${brand}-${model}`),
    brand,
    model,
    type: get(row, 'type') || 'manual',
    burr: get(row, 'burr') || 'conical',
    scale,
    calibration,
    // Imported data is third-party unless the caller says otherwise; the build
    // widens the uncertainty band accordingly.
    confidence: get(row, 'confidence') || 'community',
    sources: [get(row, 'source') || defaultSource],
  };

  if (aliases.length > 0) entry.aliases = aliases;
  const note = get(row, 'note');
  if (note) entry.note = note;

  grinders.push(entry);
}

const outFile = join(ROOT, 'data', 'grinders', `${slug(outputName)}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(grinders, null, 2)}\n`);

console.log(`Imported ${grinders.length} grinders -> ${outFile.replace(`${ROOT}/`, '')}`);
if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length} row(s):`);
  for (const s of skipped) console.log(`  - ${s}`);
}
console.log('\nNext: bump data/dataset.meta.json, then run `npm run build:data` to validate.');
