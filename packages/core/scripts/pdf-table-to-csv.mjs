#!/usr/bin/env node
/**
 * Recovers the "Священный помол" tables from the PDFs the blog publishes
 * alongside (and later instead of) its spreadsheets, and writes them as the
 * wide CSV that `twc-table-to-csv.mjs` already understands.
 *
 *   pdftotext -bbox-layout table.pdf table.xml     # poppler
 *   node scripts/pdf-table-to-csv.mjs table.xml --out data/raw/twc/pdf
 *
 * The PDFs are not a rendering of the spreadsheets — they are newer, and carry
 * grinders the sheets never had (Timemore Chestnut S3, the Sculptor pair,
 * Mavo Phantox Pro). Treating them as a duplicate of the CSVs loses those.
 *
 * Why word positions rather than `pdftotext -layout` text: the exported tables
 * wrap long headings across several lines, and poppler groups neighbouring
 * cells into one block when they share those line boxes — "Niche Zero" and
 * "Eureka Atom Pro" come back interleaved as "Niche Eureka Zero Atom Pro".
 * Only the x coordinate says which column a word belongs to.
 *
 * Pages after the first carry no Mazzer ZM column; they repeat one grinder as a
 * key instead. That column is used to carry the micron scale across, which is
 * why `--anchor` exists.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flags = new Map();
const inputs = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    flags.set(argv[i].slice(2), argv[i + 1]);
    i += 1;
  } else inputs.push(argv[i]);
}

if (inputs.length === 0) {
  console.error('usage: node scripts/pdf-table-to-csv.mjs <bbox.xml>… [--out dir] [--microns-column "Mazzer ZM"] [--anchor "EK43 (turkish)"]');
  process.exit(2);
}

const outDir = resolve(flags.get('out') ?? 'data/raw/twc/pdf');
const micronsColumn = (flags.get('microns-column') ?? 'Mazzer ZM').toLowerCase();
const anchorColumn = (flags.get('anchor') ?? 'turkish').toLowerCase();

/** Words are the only reliable unit; blocks merge neighbouring cells. */
function readWords(pageXml) {
  const words = [];
  for (const m of pageXml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)) {
    const text = m[5].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (!text || text === '￼') continue;
    words.push({ x: (+m[1] + +m[3]) / 2, y: (+m[2] + +m[4]) / 2, x0: +m[1], x1: +m[3], text });
  }
  return words;
}

/** Cluster a sorted list of coordinates wherever the gap exceeds `gap`. */
function cluster(values, gap) {
  const sorted = [...values].sort((a, b) => a - b);
  const bands = [];
  let current = [sorted[0]];
  for (const v of sorted.slice(1)) {
    if (v - current[current.length - 1] > gap) {
      bands.push(current);
      current = [];
    }
    current.push(v);
  }
  bands.push(current);
  return bands.map((b) => (b[0] + b[b.length - 1]) / 2);
}

const nearest = (centres, v) => centres.reduce((best, c, i) => (Math.abs(c - v) < Math.abs(centres[best] - v) ? i : best), 0);

/** Linear interpolation over a monotonic (x -> y) table, clamped at the ends. */
function interpolate(points, x) {
  if (points.length === 0) return undefined;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 1; i < points.length; i += 1) {
    if (x <= points[i].x) {
      const a = points[i - 1];
      const b = points[i];
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  return undefined;
}

const numeric = (text) => {
  const n = Number(String(text).replace(/,/g, '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

mkdirSync(outDir, { recursive: true });

for (const input of inputs) {
  const xml = readFileSync(resolve(input), 'utf8');
  const pages = xml.split('<page ').slice(1);
  const tables = [];

  for (const pageXml of pages) {
    const words = readWords(pageXml);
    if (words.length < 50) continue;

    // Headings wrap over several bands, so the header cannot be found by
    // position. It ends where the numbers start: the first band that is mostly
    // bare numerals and spans most of the table.
    const bands = cluster(words.map((w) => w.y), 4);
    const inBand = (c) => words.filter((w) => Math.abs(w.y - c) < 3);
    // Ranges ("9-10") are readings too, so they have to count as numeric or the
    // first data row looks like prose. That makes a wrapped "Диск 1-11" heading
    // look numeric as well, hence the second test: a data row spans the whole
    // table, a stray heading fragment spans a handful of columns.
    const isNumber = (t) => /^\d+([.,]\d+)?([-–]\d+([.,]\d+)?)?$/.test(t);
    const widest = Math.max(...bands.map((c) => inBand(c).length));

    const firstData = bands.findIndex((c) => {
      const ws = inBand(c);
      return ws.length >= widest * 0.5
        && ws.filter((w) => isNumber(w.text)).length / ws.length >= 0.4;
    });
    if (firstData <= 0) continue;

    // The sieve tables put a "Помол / Вес в граммах" row under the names; the
    // downstream transform keys its paired-column layout off exactly that row,
    // so it has to survive as its own line rather than be folded into the name.
    // "Вес в граммах" wraps, so the sub-header occupies several bands ("Вес в",
    // "Помол", "граммах"); all of them belong to one logical row.
    const subHeaderBands = bands.slice(0, firstData).filter((c) => {
      const ws = inBand(c);
      return ws.length >= 4 && ws.filter((w) => /^(Помол|Вес|в|граммах)$/i.test(w.text)).length / ws.length >= 0.5;
    });
    const subHeaderBand = subHeaderBands.length > 0 ? bands.indexOf(subHeaderBands[0]) : -1;

    const nameBands = bands.slice(0, subHeaderBand === -1 ? firstData : subHeaderBand);
    const headerWords = words.filter((w) => nameBands.some((c) => Math.abs(w.y - c) < 3));
    const dataWords = words.filter((w) => w.y > bands[firstData] - 3);
    if (dataWords.length === 0) continue;

    // Columns come from the data cells: one short value per column makes for
    // much tighter clusters than the wrapped headings do.
    //
    // No fixed gap works for both layouts — the wide tables need one bigger
    // than a multi-word cell ("2 полных оборота + 1") so it does not shatter,
    // the sieve tables need one smaller than the distance between a grinder's
    // "Помол" and "Вес" columns so those do not fuse. So split finely first,
    // then merge back anything closer than a fraction of the table's own pitch.
    const fine = cluster(dataWords.map((w) => w.x), 6);
    const gaps = fine.slice(1).map((c, i) => c - fine[i]).sort((a, b) => a - b);
    const pitch = gaps[Math.floor(gaps.length / 2)] || 20;
    const columns = [];
    for (const c of fine) {
      if (columns.length > 0 && c - columns[columns.length - 1] < pitch * 0.6) continue;
      columns.push(c);
    }
    const rows = cluster(dataWords.map((w) => w.y), 4);

    const gather = (ws, toColumn = (w) => nearest(columns, w.x)) => {
      const perColumn = columns.map(() => []);
      for (const w of ws) perColumn[toColumn(w)].push(w);
      return perColumn.map((cell) => cell
        .sort((a, b) => (Math.abs(a.y - b.y) > 3 ? a.y - b.y : a.x - b.x))
        .map((w) => w.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim());
    };

    const subHeader = subHeaderBand === -1
      ? undefined
      : gather(words.filter((w) => subHeaderBands.some((c) => Math.abs(w.y - c) < 3)));

    // In the sieve layout a grinder owns two columns, "Помол" and "Вес в
    // граммах", and its heading is centred over the pair — so half its words
    // land over the weight column. Pull every heading word back to the "Помол"
    // column that starts its pair, or the name arrives shredded across both.
    const pairStarts = subHeader
      ? subHeader.map((c, i) => (/^Помол$/i.test(c) ? i : -1)).filter((i) => i >= 0)
      : undefined;
    const toNameColumn = pairStarts?.length
      ? (w) => {
        const i = nearest(columns, w.x);
        const start = [...pairStarts].reverse().find((p) => p <= i);
        return start ?? pairStarts[0];
      }
      : undefined;

    const names = gather(headerWords, toNameColumn);

    const grid = rows.map(() => columns.map(() => []));
    for (const w of dataWords) grid[nearest(rows, w.y)][nearest(columns, w.x)].push(w);

    const table = grid.map((row) => row.map((ws) => ws
      .sort((a, b) => a.x - b.x)
      .map((w) => w.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()));

    tables.push({ names, subHeader, table });
  }

  if (tables.length === 0) {
    console.error(`${input}: no table found`);
    continue;
  }

  // Page 1 defines the micron scale. Later pages repeat one grinder as their
  // key column; read the microns off page 1's curve for that grinder so every
  // page ends up on the same absolute scale.
  const first = tables[0];
  const micronsIdx = first.names.findIndex((n) => n.toLowerCase().includes(micronsColumn));
  if (micronsIdx === -1) {
    console.error(`${input}: no "${micronsColumn}" column on the first page — nothing to pin the scale to.`);
    console.error(`  columns read: ${first.names.filter(Boolean).join(' | ')}`);
    continue;
  }
  const anchorIdx = first.names.findIndex((n) => n.toLowerCase().includes(anchorColumn));
  const anchorCurve = [];
  if (anchorIdx !== -1) {
    for (const row of first.table) {
      const x = numeric(row[anchorIdx]);
      const y = numeric(row[micronsIdx]);
      if (x !== undefined && y !== undefined) anchorCurve.push({ x, y });
    }
    anchorCurve.sort((a, b) => a.x - b.x);
  }

  for (const [pi, { names, subHeader, table }] of tables.entries()) {
    const own = names.findIndex((n) => n.toLowerCase().includes(micronsColumn));
    let out;

    if (own !== -1) {
      out = [names, ...(subHeader ? [subHeader] : []), ...table];
    } else {
      const key = names.findIndex((n) => n.toLowerCase().includes(anchorColumn));
      if (key === -1 || anchorCurve.length < 2) {
        console.error(`${input} p${pi + 1}: neither a micron column nor a usable key column — skipped`);
        continue;
      }
      // Synthesised, not measured: say so in the column name so nothing
      // downstream mistakes it for a reading off the ZM dial.
      out = [
        [...names, 'Mazzer ZM'],
        ...(subHeader ? [[...subHeader, 'Помол']] : []),
        ...table.map((row) => {
          // Cells wrap, so a page has continuation rows with no key value.
          // They must come out blank: a 0 here would read downstream as a
          // measurement at zero microns.
          const x = numeric(row[key]);
          const um = x === undefined ? undefined : interpolate(anchorCurve, x);
          return [...row, um === undefined ? '' : String(Math.round(um))];
        }),
      ];
    }

    const csv = out
      .map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
      .join('\n');
    const file = join(outDir, `${basename(input).replace(/\.xml$/, '')}-p${pi + 1}.csv`);
    writeFileSync(file, `${csv}\n`);
    console.error(`${file}: ${out.length - 1} rows x ${out[0].length} columns${own === -1 ? ' (micron scale carried across via the key column)' : ''}`);
  }
}
