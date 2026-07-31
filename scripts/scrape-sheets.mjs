#!/usr/bin/env node
/**
 * Collects the Google Sheets linked from a series of blog articles and saves
 * every tab as CSV.
 *
 * Run this on your own machine — it talks to the blog and to docs.google.com.
 *
 *   # 1. from an index page that links the articles
 *   node scripts/scrape-sheets.mjs \
 *     --index https://example.com/blog/series/ --path-contains /series/ \
 *     --out data/raw/series
 *
 *   # 2. or from an explicit list, one URL per line
 *   node scripts/scrape-sheets.mjs --urls articles.txt --out data/raw/series
 *
 *   # 3. add --browser if the articles are rendered client-side
 *   node scripts/scrape-sheets.mjs --urls articles.txt --out … --browser
 *
 * Output: <out>/*.csv plus <out>/manifest.json recording which article each
 * sheet came from, so provenance survives into the dataset's `sources`.
 *
 * Only reaches sheets that are already publicly readable. Anything requiring a
 * Google login returns HTML instead of CSV, and is reported, not silently
 * written as a broken file.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  csvExportUrl,
  extractArticleLinks,
  extractSheetRefs,
  extractTabs,
  tabIndexUrl,
} from './lib/sheet-links.mjs';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const argv = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < argv.length; i += 1) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) {
    flags.set(argv[i].slice(2), true);
  } else {
    flags.set(argv[i].slice(2), next);
    i += 1;
  }
}

const outDir = resolve(flags.get('out') ?? 'data/raw/scraped');
const useBrowser = flags.get('browser') === true;
const delayMs = Number(flags.get('delay') ?? 1000);

if (!flags.get('index') && !flags.get('urls')) {
  console.error('usage: node scripts/scrape-sheets.mjs (--index <url> | --urls <file>) --out <dir> [--browser] [--path-contains <str>] [--delay <ms>]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lazily created shared browser page; only paid for when --browser is used. */
let browser = null;
async function renderedHtml(url) {
  if (!browser) {
    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch();
  }
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    return await page.content();
  } finally {
    await page.close();
  }
}

async function fetchText(url, { asBrowser = false } = {}) {
  if (asBrowser) return renderedHtml(url);

  const response = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'sheet';
}

// ------------------------------------------------------------------ articles

let articles = [];

if (flags.get('urls')) {
  articles = readFileSync(resolve(flags.get('urls')), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
} else {
  const indexUrl = flags.get('index');
  console.log(`Reading index ${indexUrl}`);
  const html = await fetchText(indexUrl, { asBrowser: useBrowser });
  articles = extractArticleLinks(html, indexUrl, flags.get('path-contains') || undefined)
    // The index links to itself; that is not an article.
    .filter((u) => u !== indexUrl && u !== `${indexUrl}/`);
  console.log(`Found ${articles.length} candidate article(s)`);
}

if (articles.length === 0) {
  console.error('No articles to scan. Check --index / --path-contains, or pass --urls.');
  process.exit(1);
}

// -------------------------------------------------------------------- sheets

mkdirSync(outDir, { recursive: true });

const manifest = [];
const problems = [];

for (const [i, article] of articles.entries()) {
  console.log(`\n[${i + 1}/${articles.length}] ${article}`);

  let html;
  try {
    html = await fetchText(article, { asBrowser: useBrowser });
  } catch (err) {
    problems.push(`${article}: ${err.message}`);
    console.log(`  ! fetch failed: ${err.message}`);
    continue;
  }

  let refs = extractSheetRefs(html);

  // A statically-fetched page with no sheets is the classic sign of a
  // client-rendered article. Retry through a browser rather than reporting a
  // false negative.
  if (refs.length === 0 && !useBrowser) {
    console.log('  no sheets in static HTML, retrying with a browser…');
    try {
      refs = extractSheetRefs(await fetchText(article, { asBrowser: true }));
    } catch (err) {
      problems.push(`${article}: browser retry failed — ${err.message}`);
    }
  }

  if (refs.length === 0) {
    console.log('  no spreadsheets found');
    continue;
  }

  console.log(`  ${refs.length} spreadsheet(s)`);

  for (const ref of refs) {
    // Ask the sheet which tabs it has. Exporting without a gid returns only
    // the first tab, which would look like success and lose the rest.
    let tabs = [];
    try {
      tabs = extractTabs(await fetchText(tabIndexUrl(ref)));
    } catch (err) {
      problems.push(`${ref.id}: tab index failed — ${err.message}`);
    }

    if (tabs.length === 0) {
      tabs = [{ gid: ref.gid, name: 'default' }];
      console.log('    tab list unavailable, falling back to the default tab');
    }

    for (const tab of tabs) {
      const url = csvExportUrl(ref, tab.gid);
      let csv;
      try {
        csv = await fetchText(url);
      } catch (err) {
        problems.push(`${ref.id} / ${tab.name}: ${err.message}`);
        console.log(`    ! ${tab.name}: ${err.message}`);
        continue;
      }

      // A login wall answers 200 with an HTML page. Writing that as .csv would
      // poison the import step with unparseable junk.
      if (/^\s*<(?:!doctype|html)/i.test(csv)) {
        problems.push(`${ref.id} / ${tab.name}: got HTML, not CSV — sheet is probably not public`);
        console.log(`    ! ${tab.name}: not public`);
        continue;
      }

      const file = `${slug(`${ref.id.slice(0, 12)}-${tab.name}`)}.csv`;
      writeFileSync(join(outDir, file), csv);
      manifest.push({
        file,
        article,
        sheetId: ref.id,
        kind: ref.kind,
        gid: tab.gid ?? null,
        tab: tab.name,
        rows: csv.split('\n').filter((l) => l.trim()).length - 1,
      });
      console.log(`    ✓ ${tab.name} -> ${file}`);

      await sleep(delayMs);
    }
  }

  await sleep(delayMs);
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (browser) await browser.close();

console.log(`\nSaved ${manifest.length} CSV file(s) to ${outDir}`);
console.log(`Manifest: ${join(outDir, 'manifest.json')}`);

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
}

console.log('\nNext: inspect the CSVs, then map them with scripts/import-csv.mjs.');
