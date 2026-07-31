import { describe, expect, it } from 'vitest';
// Plain JS helper shared with the Node-only scraper script; types come from its JSDoc.
import {
  csvExportUrl,
  extractArticleLinks,
  extractSheetRefs,
  extractTabs,
  tabIndexUrl,
} from '../../scripts/lib/sheet-links.mjs';

const DOC_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const PUB_ID = '2PACX-1vQx7Lm9wKjR4tYzB3nVc8sHdF2gJpXeAoQwErTyUiOpAsDfGhJkLzXcVbNm';

describe('extractSheetRefs', () => {
  it('finds a plain anchor link', () => {
    const html = `<p>Data: <a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit">table</a></p>`;
    expect(extractSheetRefs(html)).toEqual([{ kind: 'doc', id: DOC_ID }]);
  });

  it('finds an embedded iframe', () => {
    const html = `<iframe src="https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pubhtml?widget=true"></iframe>`;
    expect(extractSheetRefs(html)).toEqual([{ kind: 'published', id: PUB_ID }]);
  });

  it('does not mistake a published sheet for a normal document', () => {
    // /d/e/<token> also matches the /d/<id> shape; reading it as a document id
    // yields "e" and an export URL that 404s.
    const html = `<a href="https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pubhtml">x</a>`;
    const refs = extractSheetRefs(html);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.kind).toBe('published');
    expect(refs[0]?.id).toBe(PUB_ID);
  });

  it('captures the gid when the link targets a specific tab', () => {
    const html = `<a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit#gid=123456">tab</a>`;
    expect(extractSheetRefs(html)).toEqual([{ kind: 'doc', id: DOC_ID, gid: '123456' }]);
  });

  it('does not pick up a gid belonging to a later, unrelated link', () => {
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit">first</a>
      <a href="https://example.com/other?gid=999">second</a>`;
    expect(extractSheetRefs(html)[0]?.gid).toBeUndefined();
  });

  it('deduplicates repeated links to the same tab', () => {
    const link = `https://docs.google.com/spreadsheets/d/${DOC_ID}/edit#gid=7`;
    const html = `<a href="${link}">a</a><a href="${link}">b</a>`;
    expect(extractSheetRefs(html)).toHaveLength(1);
  });

  it('keeps distinct tabs of the same spreadsheet apart', () => {
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit#gid=1">one</a>
      <a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit#gid=2">two</a>`;
    expect(extractSheetRefs(html).map((r: { gid?: string }) => r.gid)).toEqual(['1', '2']);
  });

  it('finds several spreadsheets in one article', () => {
    const other = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/${DOC_ID}/edit">a</a>
      <iframe src="https://docs.google.com/spreadsheets/d/${other}/pubhtml"></iframe>`;
    expect(extractSheetRefs(html)).toHaveLength(2);
  });

  it('returns nothing for a page with no spreadsheets', () => {
    expect(extractSheetRefs('<p>just prose and a <a href="/link">link</a></p>')).toEqual([]);
  });

  it('ignores Google Docs and Drive links that are not spreadsheets', () => {
    const html = `
      <a href="https://docs.google.com/document/d/${DOC_ID}/edit">doc</a>
      <a href="https://drive.google.com/file/d/${DOC_ID}/view">file</a>`;
    expect(extractSheetRefs(html)).toEqual([]);
  });
});

describe('extractTabs', () => {
  it('reads the tab strip of a pubhtml page', () => {
    const html = `
      <ul id="sheet-menu">
        <li id="sheet-button-0"><a href="#gid=0">Comandante</a></li>
        <li id="sheet-button-1874321"><a href="#gid=1874321">1Zpresso</a></li>
        <li id="sheet-button-99"><a href="#gid=99">Timemore</a></li>
      </ul>`;
    expect(extractTabs(html)).toEqual([
      { gid: '0', name: 'Comandante' },
      { gid: '1874321', name: '1Zpresso' },
      { gid: '99', name: 'Timemore' },
    ]);
  });

  it('falls back to the bootstrap JSON when there is no tab strip', () => {
    const html = `<script>bootstrapData = {"sheets":[{"gid":"0","name":"Main"},{"gid":"42","name":"Notes"}]};</script>`;
    expect(extractTabs(html)).toEqual([
      { gid: '0', name: 'Main' },
      { gid: '42', name: 'Notes' },
    ]);
  });

  it('names an unlabelled tab after its gid rather than leaving it blank', () => {
    expect(extractTabs('<li id="sheet-button-55"><a href="#gid=55"></a></li>')).toEqual([
      { gid: '55', name: 'sheet-55' },
    ]);
  });

  it('returns nothing when the page has no tabs at all', () => {
    expect(extractTabs('<html><body>Sign in to continue</body></html>')).toEqual([]);
  });
});

describe('csvExportUrl', () => {
  it('uses the export endpoint for a normal document', () => {
    expect(csvExportUrl({ kind: 'doc', id: DOC_ID }, '0')).toBe(
      `https://docs.google.com/spreadsheets/d/${DOC_ID}/export?format=csv&gid=0`,
    );
  });

  it('uses the pub endpoint for a published sheet', () => {
    expect(csvExportUrl({ kind: 'published', id: PUB_ID }, '7')).toBe(
      `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?output=csv&gid=7`,
    );
  });

  it('lets an explicit gid override the one carried by the ref', () => {
    expect(csvExportUrl({ kind: 'doc', id: DOC_ID, gid: '1' }, '2')).toContain('gid=2');
  });

  it('falls back to the ref gid, and omits gid entirely when there is none', () => {
    expect(csvExportUrl({ kind: 'doc', id: DOC_ID, gid: '5' })).toContain('gid=5');
    expect(csvExportUrl({ kind: 'doc', id: DOC_ID })).not.toContain('gid');
  });
});

describe('tabIndexUrl', () => {
  it('points at htmlview for documents and pubhtml for published sheets', () => {
    expect(tabIndexUrl({ kind: 'doc', id: DOC_ID })).toContain('/htmlview');
    expect(tabIndexUrl({ kind: 'published', id: PUB_ID })).toContain('/pubhtml');
  });
});

describe('extractArticleLinks', () => {
  const base = 'https://blog.example.com/series/';

  it('resolves relative links against the index URL', () => {
    const html = `<a href="/series/part-1/">1</a><a href="part-2/">2</a>`;
    expect(extractArticleLinks(html, base)).toEqual([
      'https://blog.example.com/series/part-1/',
      'https://blog.example.com/series/part-2/',
    ]);
  });

  it('stays on the same origin', () => {
    const html = `<a href="/series/part-1/">1</a><a href="https://twitter.com/x">off-site</a>`;
    expect(extractArticleLinks(html, base)).toEqual(['https://blog.example.com/series/part-1/']);
  });

  it('filters by a path fragment', () => {
    const html = `<a href="/series/part-1/">1</a><a href="/about/">about</a>`;
    expect(extractArticleLinks(html, base, '/series/')).toEqual([
      'https://blog.example.com/series/part-1/',
    ]);
  });

  it('collapses in-page anchors onto one article', () => {
    const html = `<a href="/series/part-1/">1</a><a href="/series/part-1/#tables">tables</a>`;
    expect(extractArticleLinks(html, base)).toHaveLength(1);
  });

  it('skips malformed hrefs instead of resolving them into fake articles', () => {
    // `ht!tp:` is not a valid scheme, so `new URL` treats the whole thing as a
    // relative path and would otherwise yield /series/ht!tp://[[[ .
    const html = `<a href="ht!tp://[[[">bad</a><a href="/series/part-1/">good</a>`;
    expect(extractArticleLinks(html, base)).toEqual(['https://blog.example.com/series/part-1/']);
  });

  it('skips non-http schemes', () => {
    const html = `
      <a href="mailto:hi@example.com">mail</a>
      <a href="javascript:void(0)">js</a>
      <a href="tel:+123">tel</a>
      <a href="/series/part-1/">good</a>`;
    expect(extractArticleLinks(html, base)).toEqual(['https://blog.example.com/series/part-1/']);
  });

  it('skips bare fragment links', () => {
    const html = `<a href="#top">top</a><a href="/series/part-1/">good</a>`;
    expect(extractArticleLinks(html, base)).toEqual(['https://blog.example.com/series/part-1/']);
  });
});
