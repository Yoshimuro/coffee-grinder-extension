/**
 * Pure helpers for finding Google Sheets behind a blog post and turning them
 * into CSV download URLs.
 *
 * Kept free of IO so the fiddly parsing can be unit-tested against real-world
 * markup instead of being debugged against a live site.
 */

/**
 * A sheet reference found in a page.
 *
 * Google has two URL shapes and they export differently:
 *   - `kind: 'doc'`       /spreadsheets/d/<id>/…            (normal document)
 *   - `kind: 'published'` /spreadsheets/d/e/<token>/pubhtml (File > Publish to web)
 *
 * @typedef {{ kind: 'doc' | 'published', id: string, gid?: string }} SheetRef
 */

// The published form must be tried first: `/d/e/2PACX-…` also matches the
// normal pattern, and misreading it produces an id that 404s on export.
const PUBLISHED = /docs\.google\.com\/spreadsheets\/d\/e\/([A-Za-z0-9_-]{20,})/g;
const DOC = /docs\.google\.com\/spreadsheets\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/g;

/** Trailing `gid=123` in a query string or `#gid=123` fragment. */
function gidNear(haystack, matchEnd) {
  // Look only at the remainder of the URL, not the rest of the document.
  const tail = haystack.slice(matchEnd, matchEnd + 200);
  const stop = tail.search(/["'\s<>]/);
  const url = stop === -1 ? tail : tail.slice(0, stop);
  const gid = url.match(/[?#&]gid=(\d+)/);
  return gid?.[1];
}

/**
 * Every distinct spreadsheet linked or embedded in `html`.
 *
 * Catches plain `<a href>`, `<iframe src>`, and bare URLs in text, because
 * blogs embed these three ways interchangeably. Deduplicated by id + gid.
 *
 * @param {string} html
 * @returns {SheetRef[]}
 */
export function extractSheetRefs(html) {
  /** @type {Map<string, SheetRef>} */
  const found = new Map();

  for (const [kind, pattern] of [['published', PUBLISHED], ['doc', DOC]]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const gid = gidNear(html, match.index + match[0].length);
      const key = `${kind}:${id}:${gid ?? ''}`;

      // A bare link and a gid-specific link to the same sheet are different
      // targets; keep both, but never the same one twice.
      if (!found.has(key)) {
        found.set(key, gid ? { kind, id, gid } : { kind, id });
      }
    }
  }

  return [...found.values()];
}

/**
 * Tab names and gids from a spreadsheet's `pubhtml` or `htmlview` page.
 *
 * This is the step that makes multi-tab sheets work: `export?format=csv` with
 * no gid silently returns only the first tab, so a series with one tab per
 * grinder would come back almost empty and look like it had worked.
 *
 * @param {string} html
 * @returns {Array<{ gid: string, name: string }>}
 */
export function extractTabs(html) {
  /** @type {Map<string, string>} */
  const tabs = new Map();

  // Both pubhtml and htmlview render the tab strip as
  // <li id="sheet-button-<gid>"><a …>Name</a></li>
  const buttons = /id="sheet-button-(\d+)"[^>]*>(?:\s*<a[^>]*>)?([^<]*)/g;
  let match;
  while ((match = buttons.exec(html)) !== null) {
    tabs.set(match[1], match[2].trim());
  }

  // Fallback for the bootstrap JSON some variants ship instead of a tab strip.
  if (tabs.size === 0) {
    const json = /"(?:gid|sheetId)"\s*:\s*"?(\d+)"?[^{}]*?"(?:name|title)"\s*:\s*"([^"]+)"/g;
    while ((match = json.exec(html)) !== null) {
      tabs.set(match[1], match[2].trim());
    }
  }

  return [...tabs.entries()].map(([gid, name]) => ({ gid, name: name || `sheet-${gid}` }));
}

/**
 * CSV download URL for a sheet reference.
 *
 * @param {SheetRef} ref
 * @param {string} [gid] overrides any gid carried by the ref
 * @returns {string}
 */
export function csvExportUrl(ref, gid) {
  const target = gid ?? ref.gid;
  const query = target === undefined ? '' : `&gid=${target}`;

  return ref.kind === 'published'
    ? `https://docs.google.com/spreadsheets/d/e/${ref.id}/pub?output=csv${query}`
    : `https://docs.google.com/spreadsheets/d/${ref.id}/export?format=csv${query}`;
}

/**
 * URL of the page that lists a spreadsheet's tabs.
 *
 * @param {SheetRef} ref
 * @returns {string}
 */
export function tabIndexUrl(ref) {
  return ref.kind === 'published'
    ? `https://docs.google.com/spreadsheets/d/e/${ref.id}/pubhtml`
    : `https://docs.google.com/spreadsheets/d/${ref.id}/htmlview`;
}

/**
 * Article links on a series index page, restricted to `sameOrigin` and
 * optionally filtered by a path substring.
 *
 * @param {string} html
 * @param {string} baseUrl
 * @param {string} [pathContains]
 * @returns {string[]}
 */
export function extractArticleLinks(html, baseUrl, pathContains) {
  const base = new URL(baseUrl);
  /** @type {Set<string>} */
  const links = new Set();

  const anchors = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  let match;
  while ((match = anchors.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith('#')) continue;

    // `new URL` is not a validity check here: a malformed scheme like
    // `ht!tp://…` is not recognised as absolute, so it gets resolved as a
    // *relative path* and silently becomes a plausible-looking article URL.
    // Screen the raw href first.
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
    if (hasScheme) {
      if (!/^https?:/i.test(href)) continue; // mailto:, tel:, javascript:
    } else if (href.includes('://')) {
      continue; // scheme-like but unparseable — malformed markup
    }

    let url;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }

    if (url.origin !== base.origin) continue;
    if (pathContains && !url.pathname.includes(pathContains)) continue;

    // Fragments point back into the same article; strip so they collapse.
    url.hash = '';
    links.add(url.toString());
  }

  return [...links];
}
