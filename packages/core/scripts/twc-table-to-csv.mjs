#!/usr/bin/env node
/**
 * Turns the "Священный помол" tables into the column shape `import-csv.mjs`
 * expects.
 *
 *   node scripts/twc-table-to-csv.mjs data/raw/twc/*.csv \
 *     --api data/raw/twc/grinders-api.json --exclude-ids a,b > twc.csv
 *   node scripts/import-csv.mjs twc.csv theweldercatherine --source <article url>
 *
 * The tables are laid out the other way round from our schema: one column per
 * grinder, one row per grind size. What makes them usable at all is that one of
 * those columns — the Mazzer ZM — is dialled in microns, so every row carries an
 * absolute particle size the other columns can be pinned to. Read down a column
 * and you have exactly an `anchors` calibration.
 *
 * Two layouts appear across the series and both are handled:
 *
 *   wide    one column per grinder, one row per grind size
 *   sieve   two columns per grinder ("Помол" / "Вес в граммах") and four rows
 *           per grind size, one per sieve fraction; the setting is written only
 *           on the first row of each block
 *
 * Passing both gives a denser curve than either alone: the sieve table steps
 * 400-750 µm in 25 µm increments, the wide one reaches 830 µm in coarser steps.
 *
 * `--api` takes the grinder list from the blog's own recipe app
 * (recipes.theweldercatherine.ru/api/v1/grinders). It supplies two things the
 * spreadsheets cannot: canonical brand/model names, and `sub_step`, the number
 * of positions in one turn of a rotating dial. Without that period a cell like
 * "2 оборота 3" cannot be resolved to an absolute click count at all.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const flags = new Map();
const inputs = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    flags.set(argv[i].slice(2), argv[i + 1]);
    i += 1;
  } else {
    inputs.push(argv[i]);
  }
}

if (inputs.length === 0) {
  console.error('usage: node scripts/twc-table-to-csv.mjs <table.csv>… [--api grinders-api.json] [--microns-column "Mazzer ZM"] [--exclude-ids a,b]');
  process.exit(2);
}

const micronsColumn = flags.get('microns-column') ?? 'Mazzer ZM';
const excluded = new Set((flags.get('exclude-ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean));

/** Minimal RFC 4180 parser, same rules as import-csv.mjs. */
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
        } else quoted = false;
      } else field += ch;
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
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const tidy = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/** Loose key for matching a spreadsheet heading against an API entry. */
function matchKey(text) {
  return tidy(text)
    .toLowerCase()
    .replace(/диск\s*[\d\s-]+/g, '')
    .replace(/жернова|эспрессо|\(|\)/g, '')
    .replace(/[^a-zа-яё0-9]/gi, '');
}

// ------------------------------------------------------------------- the API

/**
 * @typedef {{ brand: string, model: string, perRotation?: number, dialMin?: number, dialMax?: number }} ApiEntry
 */

/** @type {Map<string, ApiEntry>} */
const api = new Map();

if (flags.get('api')) {
  const payload = JSON.parse(readFileSync(resolve(flags.get('api')), 'utf8'));
  for (const g of payload.value ?? []) {
    const brand = tidy(g.manufacturer);
    const model = tidy(g.model);

    // `sub_step` is only a usable period when it reads as a 0..N range. Several
    // entries carry reversed or nonsensical pairs (4..0, 11..3) — guessing a
    // period from those would silently shift every setting on that dial.
    // Only a 0..N pair is trustworthy. An earlier version also read a repeated
    // value (`9-9`) as the period; the sole grinder that fired for was the Kinu
    // M47, whose dial actually carries 50 marks per turn, and the decode came
    // out ~7x fine. A rule that is wrong every time it applies is worse than no
    // rule: the cell is simply unreadable without a documented period.
    let perRotation;
    if (g.sub_step_start === 0 && g.sub_step_end > 0 && g.sub_step_end <= 60) perRotation = g.sub_step_end + 1;

    const entry = { brand, model, perRotation, dialMin: g.step_start, dialMax: g.step_end };
    api.set(matchKey(`${brand} ${model}`), entry);
    // Headings often omit the brand ("Feldgrind 2", "Kinu m47 phoenix").
    const modelOnly = matchKey(model);
    if (modelOnly && !api.has(modelOnly)) api.set(modelOnly, entry);
    const brandModel = matchKey(`${brand}${model}`);
    if (!api.has(brandModel)) api.set(brandModel, entry);
  }
}

/** @param {string} heading */
function lookup(heading) {
  const key = matchKey(heading);
  if (api.has(key)) return api.get(key);
  // Fall back to a unique prefix match: "Comandante (red clix)" -> "Comandante Red clix".
  const hits = [...api.entries()].filter(([k]) => k.startsWith(key) || key.startsWith(k));
  return hits.length === 1 ? hits[0][1] : undefined;
}

// ------------------------------------------------------------- cell decoding

/**
 * A dial position expressed as turns plus a position within the turn:
 * "1+4", "2 полных оборота + 3", "1 ОБОРОТ 9", "2й круг/ 0-9".
 *
 * @param {string} text
 * @returns {{ turn: number, within: string } | undefined}
 */
function splitTurns(text) {
  // `\w` is ASCII-only in JavaScript, so the Cyrillic endings have to be
  // spelled out: "оборот", "оборота", "оборотов", "круг", "круга".
  const turn = text.match(/^\s*(\d+)\s*(?:й\s*круг[а-яё]*|полн[а-яё]*\s*оборот[а-яё]*|оборот[а-яё]*)?\s*[/+]\s*(.+)$/i)
    ?? text.match(/^\s*(\d+)\s*(?:оборот[а-яё]*|круг[а-яё]*)\s+(.+)$/i);
  if (!turn) return undefined;
  return { turn: Number(turn[1]), within: turn[2] };
}

/** A plain number or a "9-10" range, taken at its midpoint. */
function plainNumber(text) {
  const normalised = text.replace(/,/g, '.').replace(/\s+/g, '');
  const range = normalised.match(/^(\d+(?:\.\d+)?)[-–](\d+(?:\.\d+)?)$/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) return (lo + hi) / 2;
  }
  const single = Number(normalised);
  return Number.isFinite(single) ? single : undefined;
}

/**
 * A cell as an absolute position on the grinder's own number line.
 *
 * @param {string} raw
 * @param {number | undefined} perRotation
 * @returns {{ value: number } | { reason: string }}
 */
function parseSetting(raw, perRotation) {
  const text = tidy(raw);
  if (text === '' || text === '-' || text === '—') return { reason: 'not measured' };
  if (/[|]/.test(text)) return { reason: `tick marks (${text})` };

  const turns = splitTurns(text);
  if (turns) {
    const within = plainNumber(turns.within);
    if (within === undefined) return { reason: `unreadable turn (${text})` };
    if (perRotation === undefined) return { reason: `turns without a known period (${text})` };
    // Turn 1 is the first turn off the stop, so it contributes nothing itself.
    return { value: (turns.turn - 1) * perRotation + within };
  }

  // Lettered dials (Baratza Forte's "2H-2J") are not a number line at all.
  if (/[a-zа-яё]/i.test(text)) return { reason: `lettered dial (${text})` };

  const value = plainNumber(text);
  return value === undefined ? { reason: `unparseable (${text})` } : { value };
}

// ----------------------------------------------------------- table decoding

/**
 * Every grinder column of a table as (setting, microns) pairs.
 *
 * @param {string[][]} rows
 * @returns {Map<string, Array<{ setting: number, microns: number }>>}
 */
function readTable(rows, dropped) {
  const sieve = (rows[1] ?? []).some((c) => /^Помол$/i.test(tidy(c)));
  const headings = rows[0].map(tidy);
  const body = rows.slice(sieve ? 2 : 1);

  // In the sieve layout the grinder heading sits above its "Помол" column and
  // the "Вес в граммах" column beside it is unlabelled; a setting is written
  // only on the first row of each four-row fraction block.
  const columns = [];
  for (let c = 0; c < headings.length; c += 1) {
    if (!headings[c]) continue;
    if (sieve && !/^Помол$/i.test(tidy(rows[1][c]))) continue;
    columns.push({ heading: headings[c], index: c });
  }

  const micronsCol = columns.find((c) => c.heading.toLowerCase().includes(micronsColumn.toLowerCase()));
  if (!micronsCol) return new Map();

  /** @type {Map<string, Array<{ setting: number, microns: number }>>} */
  const out = new Map();

  for (const column of columns) {
    if (column === micronsCol) continue;
    const entry = lookup(column.heading);
    const points = [];

    for (const row of body) {
      const microns = plainNumber(tidy(row[micronsCol.index]));
      // Undefined on a sieve continuation row or past the end of the ZM dial;
      // zero where a converted table left an empty cell as a numeral.
      if (microns === undefined || microns <= 0) continue;
      const parsed = parseSetting(row[column.index], entry?.perRotation);
      if ('reason' in parsed) {
        if (parsed.reason !== 'not measured') {
          dropped.set(column.heading, (dropped.get(column.heading) ?? new Set()).add(parsed.reason));
        }
        continue;
      }
      points.push({ setting: parsed.value, microns });
    }

    if (points.length > 0) out.set(column.heading, points);
  }

  return out;
}

// ---------------------------------------------------------------------- main

/** @type {Map<string, { heading: string, points: Array<{ setting: number, microns: number }> }>} */
const merged = new Map();
/** @type {Map<string, Set<string>>} */
const dropped = new Map();

for (const file of inputs) {
  const rows = parseCsv(readFileSync(resolve(file), 'utf8'));
  if (rows.length < 3) continue;
  for (const [heading, points] of readTable(rows, dropped)) {
    const entry = lookup(heading);
    const key = entry ? matchKey(`${entry.brand} ${entry.model}`) : matchKey(heading);
    const existing = merged.get(key);
    if (existing) existing.points.push(...points);
    else merged.set(key, { heading, points: [...points] });
  }
}

/**
 * Headings the API cannot name, either because the model is absent from it or
 * because one of the two sides has a typo ("Fiorenzto", "MWH-3BOMBER").
 */
const FALLBACK_NAMES = new Map([
  ['Anfim Drogheria', { brand: 'Anfim', model: 'Drogheria' }],
  ['Fiorenzto F4 Filter', { brand: 'Fiorenzato', model: 'F4 Filter' }],
  ['Hario Coffee Grinder', { brand: 'Hario', model: 'Coffee Grinder' }],
  ['MHW-3BOMBER Racing M1', { brand: 'MHW-3BOMBER', model: 'Racing M1' }],
  ['MHW-3BOMBER Blade R3', { brand: 'MHW-3BOMBER', model: 'Blade R3' }],
  ['Mischef Electric Mini', { brand: 'Mischief', model: 'Electric Grinder Mini' }],
  ['XEOLEO', { brand: 'Shenzhen Xeoleo', model: 'Manual Grinder' }],
  ['Mahlkonig EK43 ICON (coffee) диск 1-16', { brand: 'Mahlkönig', model: 'EK43 ICON (coffee, dial 1-16)' }],
  ['Mahlkönig EK43 ICON(coffee) Диск 1-16', { brand: 'Mahlkönig', model: 'EK43 ICON (coffee, dial 1-16)' }],
  // The three EK43 dial ranges are separate calibrations; the API spells them
  // inconsistently, so pin the names here rather than let them collapse.
  ['Mahlkönig EK43 (turkish) Диск 1-11', { brand: 'Mahlkönig', model: 'EK43 (turkish, dial 1-11)' }],
  ['Mahlkönig EK43 (turkish) Диск 1-11 ', { brand: 'Mahlkönig', model: 'EK43 (turkish, dial 1-11)' }],
  ['Mahlkönig EK43(coffee) Диск 1-11', { brand: 'Mahlkönig', model: 'EK43 (coffee, dial 1-11)' }],
  ['Mahlkönig EK43 (coffee) Диск 1-16', { brand: 'Mahlkönig', model: 'EK43 (coffee, dial 1-16)' }],
  ['Mahlkönig EK43(coffee) Диск 1-16', { brand: 'Mahlkönig', model: 'EK43 (coffee, dial 1-16)' }],
  // The API files these under a stray word as the manufacturer, or shouts the
  // brand in capitals where the rest of the catalogue does not.
  // The picker shows the model alone, so a model that is only a number or a
  // bare suffix ("2", "83V") is unreadable without its brand beside it.
  ['DF83V', { brand: 'Turin', model: 'DF83V' }],
  // Merging keeps the heading from the first table that mentioned the grinder,
  // so both spellings need an entry.
  ['Feldgrind', { brand: 'Knock', model: 'Feldgrind 2' }],
  ['Feldgrind 2', { brand: 'Knock', model: 'Feldgrind 2' }],
  ['EUREKA MIGNON CRONO', { brand: 'Eureka', model: 'Mignon Crono' }],
  ['Eureka MIGNON CRONO', { brand: 'Eureka', model: 'Mignon Crono' }],
  ['Mahlkönig Tanzania Диск 0-9', { brand: 'Mahlkönig', model: 'Tanzania (dial 0-9)' }],
  ['Mahlkönig Tanzania  Диск 0-9', { brand: 'Mahlkönig', model: 'Tanzania (dial 0-9)' }],
  ['Timemore Chestnut x lite', { brand: 'Timemore', model: 'Chestnut X Lite' }],
  ['Timemore Chestnut X lite', { brand: 'Timemore', model: 'Chestnut X Lite' }],
]);

/**
 * Headings naming a grinder the catalogue already carries under a different id.
 * Importing them would put two entries for the same machine in front of the
 * user, with the worse-sourced one indistinguishable.
 *
 * The value is the catalogue id, which `--compare` uses to check this source's
 * readings against the entry we already ship.
 */
const ALREADY_CATALOGUED = new Map([
  ['Comandante C40', 'comandante-c40-mk4'],
  ['Comandante (red clix)', 'comandante-c40-red-clix'],
  ['Comandante (Red clix)', 'comandante-c40-red-clix'],
  ['Timemore Chestnut C2', 'timemore-c2'],
  ['Timemore Chestnut C3', 'timemore-c3'],
  ['Chestnut c3 ESP', 'timemore-c3-esp'],
  ['Ditting для дрипов', 'ditting-807-lab-sweet'],
  // The catalogue's kinu-m47 is the same machine, calibrated from the maker's
  // own figures rather than inferred from a sieve run.
  ['Kinu m47 phoenix', 'kinu-m47'],
  ['Kinu', 'kinu-m47'],
]);

/**
 * Caveats that belong on a specific entry and cannot be inferred from the data.
 * Keyed by spreadsheet heading.
 */
const EXTRA_NOTES = new Map([
  // Its 5-39 range rules out the catalogue's hario-slim (0-20), so this is a
  // different machine — but the source never says which one.
  ['Hario Coffee Grinder', 'The source does not identify which Hario model was measured; its 5-39 range does not match the Slim or Skerton Pro.'],
]);

/**
 * Headings that name a brand but no model, so nothing can be attributed to a
 * specific grinder. Anchored and whole-string: "Mahlkönig" alone is useless,
 * "Mahlkönig Tanzania" is not.
 */
const NOT_A_MODEL = /^(TIMEMORE|Mahlkönig|Ditting|Диапазоны фракций|китайская копия.*)$/i;

/**
 * Columns this source measures on a scale that contradicts the manufacturer.
 *
 * Comparing the shared grinders (`--compare`) showed every 1Zpresso column
 * reading about 2.5x fine against the maker's published step — JX at ~9.6 µm
 * per click where 1zpresso.coffee documents 25, K-Plus likewise. Whatever the
 * cause, the models only this source covers sit on that same broken scale, so
 * shipping them would put two mutually inconsistent 1Zpresso scales in one
 * picker with nothing to tell them apart.
 */
const UNRELIABLE = new Map([
  ['1Zpresso JE', '1Zpresso columns read ~2.5x fine against the maker’s published step'],
  ['1Zpresso Q2', '1Zpresso columns read ~2.5x fine against the maker’s published step'],
]);

/**
 * Catalogue ids the caller intends to overwrite with this source, passed as
 * `--replace niche-zero,hario-slim`. They are emitted despite being catalogued;
 * merging the result into the existing entry is the caller's job.
 */
const replacing = new Set((flags.get('replace') ?? '').split(',').map((s) => s.trim()).filter(Boolean));

const out = [
  ['brand', 'model', 'type', 'burr', 'min', 'max', 'step', 'unit', 'clicks_per_rotation', 'anchors', 'confidence', 'note'],
];
const skipped = [];

const ELECTRIC = /Mahlk|Mazzer|Baratza|Ditting|Eureka|Fiorenz|Niche|Fellow Ode|Fellow Opus|Wilfa|Varia VS3|Lagom|Anfim|XEOLEO|Xeoleo|Saint Anthony|Mischi?ef Electric|DF64|DF83|DF |Turin|Omni Cup|EK-?43|Grinder Go|Sculptor|Potu|Omnia/i;
const FLAT = /EK43|EK-43|Ditting|Fellow Ode|Fellow Opus|Wilfa Svart Uniform|Lagom|DF83|DF64|DF |Turin|Fiorenz|Anfim|Omni Cup|Tanzania|Sculptor|Omnia|Niche/i;

// Two headings can resolve to the same grinder ("Fiorenzto F4 Filter" and
// "Fiorenzato F4 Filter"); collapse on the final id so their readings combine
// into one curve rather than two competing entries.
/** @type {Map<string, { heading: string, name: ApiEntry, perRotation?: number, points: Array<{setting: number, microns: number}> }>} */
const byId = new Map();

// --compare: instead of emitting a CSV, check this source's readings against
// the calibrations already shipped. Two independent measurements of the same
// grinder should land on the same micron figure; a constant ratio between them
// means one of the two curves has the wrong slope, which no amount of extra
// data points will fix.
if (flags.get('compare')) {
  const dataset = JSON.parse(readFileSync(resolve(flags.get('compare')), 'utf8'));
  const catalogue = new Map((dataset.grinders ?? dataset).map((g) => [g.id, g]));

  /** Microns a catalogue entry reports for a setting. */
  const micronsOf = (g, setting) => {
    const c = g.calibration;
    if (c.kind === 'linear') return c.zeroOffsetMicrons + setting * c.micronsPerStep;
    const p = c.points;
    if (setting <= p[0].setting) return p[0].microns;
    if (setting >= p[p.length - 1].setting) return p[p.length - 1].microns;
    for (let i = 1; i < p.length; i += 1) {
      if (setting <= p[i].setting) {
        const a = p[i - 1];
        const b = p[i];
        return a.microns + ((b.microns - a.microns) * (setting - a.setting)) / (b.setting - a.setting);
      }
    }
    return p[p.length - 1].microns;
  };

  const report = [];
  for (const { heading, points } of merged.values()) {
    const entry = lookup(heading);
    const name = FALLBACK_NAMES.get(heading) ?? entry;
    const id = ALREADY_CATALOGUED.get(heading) ?? (name ? slug(`${name.brand}-${name.model}`) : undefined);
    const shipped = id ? catalogue.get(id) : undefined;
    if (!shipped) continue;

    const ratios = [];
    let inRange = 0;
    for (const p of points) {
      if (!(p.microns > 0)) continue; // a blank or zero cell in the micron column
      const mine = micronsOf(shipped, p.setting);
      // Readings past either end of the shipped curve are clamped, so their
      // ratio says nothing about agreement.
      const span = shipped.calibration.kind === 'anchors' ? shipped.calibration.points : undefined;
      if (span && (p.setting < span[0].setting || p.setting > span[span.length - 1].setting)) continue;
      inRange += 1;
      ratios.push(mine / p.microns);
    }
    if (ratios.length < 2) continue;

    ratios.sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    const spread = ratios[ratios.length - 1] / ratios[0];
    report.push({ heading, id, n: inRange, median, lo: ratios[0], hi: ratios[ratios.length - 1], spread, confidence: shipped.confidence });
  }

  report.sort((a, b) => Math.abs(Math.log(b.median)) - Math.abs(Math.log(a.median)));
  process.stdout.write('grinder                        catalogue id             n   catalogue/source   spread  confidence  verdict\n');
  for (const r of report) {
    // A tight spread with an off-centre median is a slope error, not noise.
    const verdict = Math.abs(Math.log(r.median)) < Math.log(1.2)
      ? 'agrees'
      : r.spread < 1.25
        ? 'SYSTEMATIC — one curve is wrong'
        : 'diverges';
    process.stdout.write(
      `${r.heading.slice(0, 30).padEnd(31)}${r.id.padEnd(25)}${String(r.n).padStart(2)}   `
      + `${r.median.toFixed(2)}x (${r.lo.toFixed(2)}-${r.hi.toFixed(2)})`.padEnd(19)
      + `${r.spread.toFixed(2)}   ${r.confidence.padEnd(12)}${verdict}\n`,
    );
  }
  process.exit(0);
}

for (const { heading, points } of merged.values()) {
  const catalogued = ALREADY_CATALOGUED.get(heading);

  if (UNRELIABLE.has(heading)) {
    skipped.push(`${heading}: dropped — ${UNRELIABLE.get(heading)}`);
    continue;
  }
  if (NOT_A_MODEL.test(heading)) {
    skipped.push(`${heading}: names no specific model`);
    continue;
  }
  if (catalogued && !replacing.has(catalogued)) {
    skipped.push(`${heading}: already catalogued as ${catalogued}`);
    continue;
  }

  const entry = lookup(heading);
  // An explicit name wins over the API: the API collapses the three EK43 dial
  // ranges into near-identical strings, and carries its own typos.
  const name = FALLBACK_NAMES.get(heading) ?? entry;
  if (!name) {
    skipped.push(`${heading}: no canonical name (absent from the API)`);
    continue;
  }

  const id = catalogued ?? slug(`${name.brand}-${name.model}`);
  if (excluded.has(id) && !replacing.has(id)) {
    skipped.push(`${heading}: already in the catalogue as ${id}`);
    continue;
  }

  const bucket = byId.get(id);
  if (bucket) bucket.points.push(...points);
  else byId.set(id, { heading, name, perRotation: entry?.perRotation, points: [...points] });
}

for (const { heading, name, perRotation, points: raw } of [...byId.values()].sort((a, b) => a.heading.localeCompare(b.heading))) {
  const entry = { perRotation };

  // A setting measured twice must not map to two micron values: the converter
  // inverts these curves, and an ambiguous inverse is worse than a coarser one.
  const bySetting = new Map();
  for (const p of raw) bySetting.set(p.setting, [...(bySetting.get(p.setting) ?? []), p.microns]);

  const averaged = [...bySetting.entries()]
    .map(([setting, ums]) => ({ setting, microns: ums.reduce((a, b) => a + b, 0) / ums.length }))
    .sort((a, b) => a.setting - b.setting);

  // Keep the LONGEST run that rises with the setting, not the first one found.
  // Several columns splice two measurement series together — the Niche Zero
  // column runs 26→45 over 400-510 µm and then restarts at 21 — and a greedy
  // scan anchors on whichever series happens to start lowest, throwing away the
  // good data behind it. Here that turned 15 readings into 2 before anyone
  // noticed, because the result was still monotonic and still validated.
  const best = new Array(averaged.length).fill(1);
  const prev = new Array(averaged.length).fill(-1);
  let end = 0;
  for (let i = 0; i < averaged.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (averaged[j].microns < averaged[i].microns && best[j] + 1 > best[i]) {
        best[i] = best[j] + 1;
        prev[i] = j;
      }
    }
    if (best[i] > best[end]) end = i;
  }

  const monotonic = [];
  for (let i = averaged.length ? end : -1; i >= 0; i = prev[i]) monotonic.unshift(averaged[i]);
  for (const p of averaged) {
    if (!monotonic.includes(p)) dropped.set(heading, (dropped.get(heading) ?? new Set()).add(`conflicting reading at ${p.setting}`));
  }

  // Anchors ship as whole microns, and rounding can collapse two neighbouring
  // readings onto the same value — which makes the curve non-strict and the
  // build reject it. Rounding is the last step, so the tie has to be resolved
  // here rather than before.
  const rounded = [];
  for (const p of monotonic) {
    const microns = Math.round(p.microns);
    if (rounded.length > 0 && microns <= rounded[rounded.length - 1].microns) {
      dropped.set(heading, (dropped.get(heading) ?? new Set()).add(`rounds onto ${microns} µm at setting ${p.setting}`));
      continue;
    }
    rounded.push({ setting: p.setting, microns });
  }
  monotonic.length = 0;
  monotonic.push(...rounded);

  const reasons = [...(dropped.get(heading) ?? [])];
  if (monotonic.length < 2) {
    skipped.push(`${heading}: ${monotonic.length} usable point(s)${reasons.length ? ` — ${reasons.join('; ')}` : ''}`);
    continue;
  }

  const settings = monotonic.map((p) => p.setting);
  const step = settings.some((s) => !Number.isInteger(s)) ? 0.5 : 1;

  const notes = ['Calibrated against the Mazzer ZM micron dial in the same table.'];
  if (EXTRA_NOTES.has(heading)) notes.push(EXTRA_NOTES.get(heading));
  if (entry?.perRotation) notes.push(`Turns resolved at ${entry.perRotation} positions per rotation.`);
  if (reasons.length > 0) notes.push(`Dropped: ${reasons.join('; ')}.`);

  out.push([
    name.brand,
    name.model,
    ELECTRIC.test(heading) || ELECTRIC.test(`${name.brand} ${name.model}`) ? 'electric' : 'manual',
    FLAT.test(heading) || FLAT.test(`${name.brand} ${name.model}`) ? 'flat' : 'conical',
    String(Math.min(...settings)),
    String(Math.max(...settings)),
    String(step),
    'click',
    entry?.perRotation ? String(entry.perRotation) : '',
    monotonic.map((p) => `${p.setting}:${p.microns}`).join('; '),
    'community',
    notes.join(' '),
  ]);
}

const csv = out
  .map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
  .join('\n');
process.stdout.write(`${csv}\n`);

console.error(`${out.length - 1} grinder(s) with a usable calibration, from ${inputs.length} table(s).`);
if (skipped.length > 0) {
  console.error(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.error(`  - ${s}`);
}
