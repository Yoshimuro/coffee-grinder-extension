# Grinder Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both native `<select>` grinder pickers with a searchable combobox that shows recents and collapsed brand groups instead of 176 rows.

**Architecture:** A single self-contained widget in `src/ui/grinder-picker.ts` renders a button plus a panel (search field + list) and reports selections through a callback. `src/ui/popup.ts` creates two instances where it currently reads two `<select>` elements. `src/core/*` is untouched — `searchGrinders`, `groupByBrand` and `displayName` already exist and are already tested.

**Tech Stack:** TypeScript, Vite, plain DOM (no framework), Vitest for pure logic, Playwright for the popup.

## Global Constraints

- Manifest V3: no inline script, no inline style, no remote code. Everything ships in `popup.js` / `popup.css`.
- `src/core/` must not import `chrome.*` or touch the DOM. Nothing in this plan changes `src/core/`.
- Vitest runs with `environment: 'node'` (`vitest.config.ts`). Unit tests cover pure functions only; anything touching the DOM is covered by Playwright.
- CSS class names follow the existing BEM-ish convention: `.block`, `.block__element`.
- `data-testid` values already in use must keep resolving to the same logical field: `from-grinder`, `to-grinder`, `from-setting`, `result-value`, `result-unit`, `result-band`, `microns`, `methods`, `warning`, `from-hint`, `dataset-meta`.
- The popup is 340 px wide; Chrome caps popup height near 600 px.
- Every task ends with `npm run verify` passing.

---

### Task 1: Recents list logic

Pure list manipulation, kept in `prefs.ts` because it is part of remembering what the user did.

**Files:**
- Modify: `src/ui/prefs.ts`
- Test: `tests/unit/prefs.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `pushRecent(recents: string[], id: string, limit?: number): string[]` and `Prefs.recentIds: string[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/prefs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, pushRecent } from '../../src/ui/prefs.js';

describe('pushRecent', () => {
  it('puts the newest id first', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('moves an id already present rather than duplicating it', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('truncates to the limit, dropping the oldest', () => {
    expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });

  it('accepts an empty history', () => {
    expect(pushRecent([], 'a')).toEqual(['a']);
  });

  it('defaults recentIds to an empty list', () => {
    expect(DEFAULT_PREFS.recentIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/prefs.test.ts`
Expected: FAIL — `pushRecent` is not exported from `prefs.ts`.

- [ ] **Step 3: Implement**

In `src/ui/prefs.ts`, extend the interface and the default, then add the helper.

Change the `Prefs` interface to:

```ts
export interface Prefs {
  fromId: string | null;
  toId: string | null;
  fromSetting: number | null;
  /** Most recently selected grinder ids, newest first. Shared by both fields. */
  recentIds: string[];
}
```

Change the default to:

```ts
export const DEFAULT_PREFS: Prefs = {
  fromId: null,
  toId: null,
  fromSetting: null,
  recentIds: [],
};
```

Append to the file:

```ts
/**
 * The recents list with `id` moved to the front.
 *
 * The storage key is unchanged: `loadPrefs` merges over `DEFAULT_PREFS`, so an
 * object stored before this field existed reads back with an empty list rather
 * than `undefined`, and needs no migration.
 */
export function pushRecent(recents: string[], id: string, limit = 5): string[] {
  return [id, ...recents.filter((existing) => existing !== id)].slice(0, limit);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/prefs.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verify nothing else broke**

Run: `npm run verify`
Expected: all green. `savePrefs` callers still typecheck because `persist()` is updated in Task 2 — if `tsc` complains that `recentIds` is missing in the object literal passed to `savePrefs`, that is expected here only if you changed `persist()`; leave `persist()` alone in this task and add `recentIds: prefs.recentIds` in Task 2.

If `tsc --noEmit` fails on `persist()` in `src/ui/popup.ts` because `Prefs` now requires `recentIds`, make the field optional-safe by keeping `persist()` compiling with a spread of the loaded prefs — but do **not** restructure `persist()` here. The minimal fix in this task:

```ts
// src/ui/popup.ts — inside persist()
await savePrefs({
  fromId: fromSelect.value,
  toId: toSelect.value,
  fromSetting: Number(settingInput.value),
  recentIds: [],
});
```

Task 2 replaces this whole function.

- [ ] **Step 6: Commit**

```bash
git add src/ui/prefs.ts src/ui/popup.ts tests/unit/prefs.test.ts
git commit -m "feat(prefs): remember recently selected grinders"
```

---

### Task 2: Searchable picker replacing both selects

The widget, its styles, the popup wiring, and the port of every test that drives a `<select>`. These cannot be split: a half-wired picker leaves the popup broken and the suite red.

**Files:**
- Create: `src/ui/grinder-picker.ts`
- Modify: `src/ui/popup.html` (replace two `<select>` elements with mount points)
- Modify: `src/ui/popup.css` (append picker styles)
- Modify: `src/ui/popup.ts` (create pickers instead of populating selects)
- Modify: `tests/e2e/fixtures.ts` (add a `selectGrinder` helper)
- Modify: `tests/e2e/converter.spec.ts` (use the helper)
- Modify: `scripts/screenshot.mjs` (same selectors)

**Interfaces:**
- Consumes: `pushRecent`, `Prefs.recentIds` (Task 1); `searchGrinders`, `displayName`, `allGrinders`, `grinderById` from `src/core/dataset.js`.
- Produces:
  - `createGrinderPicker(options: GrinderPickerOptions): GrinderPicker`
  - `interface GrinderPickerOptions { mount: HTMLElement; grinders: Grinder[]; selectedId: string; label: string; onSelect: (id: string) => void }`
  - `interface GrinderPicker { setSelected(id: string): void; getSelected(): string; setRecents(ids: string[]): void }`
  - DOM contract used by tests and later tasks: root `div.picker[data-testid="<field>"][data-value="<id>"]`, button `[data-testid="<field>-button"]`, search `[data-testid="<field>-search"]`, list `[data-testid="<field>-list"]`, options `li.picker__option[role="option"][data-id="<id>"]`.
  - `selectGrinder(popup: Page, field: 'from-grinder' | 'to-grinder', id: string): Promise<void>` exported from `tests/e2e/fixtures.ts`.

- [ ] **Step 1: Write the failing test**

Replace the first test in `tests/e2e/converter.spec.ts` and add a search test. Change the import line to pull in the helper:

```ts
import { expect, selectGrinder, test } from './fixtures.js';
```

Replace the `loads the bundled dataset into both pickers` test with:

```ts
test('loads the bundled dataset into both pickers', async ({ popup }) => {
  await expect(popup.getByTestId('dataset-meta')).toContainText('grinders');

  // Both pickers must offer the same catalogue — a converter that can read a
  // grinder but not write to it would be a silent gap.
  const from = await optionNames(popup, 'from-grinder', 'comandante');
  const to = await optionNames(popup, 'to-grinder', 'comandante');
  expect(from).toEqual(to);
  expect(from.length).toBeGreaterThan(0);
});

test('narrows the list as characters are typed', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  const search = popup.getByTestId('from-grinder-search');
  const options = popup.getByTestId('from-grinder-list').locator('li[role="option"]');

  await search.fill('c');
  const loose = await options.count();

  await search.fill('c40');
  const tight = await options.count();

  expect(tight).toBeLessThan(loose);
  await expect(options.first()).toContainText('C40');
});

test('reports when nothing matches', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  await popup.getByTestId('from-grinder-search').fill('zzzz');
  await expect(popup.getByTestId('from-grinder-list')).toContainText('No grinders match');
});
```

Add this helper at the bottom of the spec file:

```ts
/** Names currently offered by a picker for a given query. */
async function optionNames(popup: Page, field: string, query: string): Promise<string[]> {
  await popup.getByTestId(`${field}-button`).click();
  await popup.getByTestId(`${field}-search`).fill(query);
  const names = await popup
    .getByTestId(`${field}-list`)
    .locator('li[role="option"]')
    .allTextContents();
  await popup.keyboard.press('Escape');
  return names;
}
```

and add `Page` to the imports:

```ts
import type { Page } from '@playwright/test';
```

Then replace every `await popup.getByTestId('from-grinder').selectOption(X);` with
`await selectGrinder(popup, 'from-grinder', X);` and likewise for `to-grinder`.
There are 14 such calls at lines 23, 24, 36, 37, 53, 71, 72, 82, 83, 98, 102, 105, 114, 115.

Finally, in the persistence test, replace the two `toHaveValue` assertions:

```ts
await expect(reopened.getByTestId('from-grinder')).toHaveAttribute('data-value', RED_CLIX);
await expect(reopened.getByTestId('to-grinder')).toHaveAttribute('data-value', JX_PRO);
```

- [ ] **Step 2: Add the e2e helper**

In `tests/e2e/fixtures.ts`, append:

```ts
/**
 * Pick a grinder by id through the real widget: open, type, click.
 *
 * The query is derived from the id, which is a slug of brand and model, so its
 * words are exactly what `searchGrinders` matches against. If a future id stops
 * matching its own name the click fails loudly rather than selecting the wrong
 * grinder.
 */
export async function selectGrinder(
  popup: Page,
  field: 'from-grinder' | 'to-grinder',
  id: string,
): Promise<void> {
  await popup.getByTestId(`${field}-button`).click();
  await popup.getByTestId(`${field}-search`).fill(id.replace(/-/g, ' '));
  await popup.getByTestId(`${field}-list`).locator(`li[data-id="${id}"]`).click();
  await expect(popup.getByTestId(field)).toHaveAttribute('data-value', id);
}
```

and extend the existing re-export line so `expect` is available to the helper:

```ts
export { expect } from '@playwright/test';
```

(If that line already exists, leave it.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run build && npx playwright test`
Expected: FAIL — `from-grinder-button` does not exist.

- [ ] **Step 4: Write the widget**

Create `src/ui/grinder-picker.ts`:

```ts
import { displayName, searchGrinders } from '../core/dataset.js';
import type { Grinder } from '../core/types.js';

export interface GrinderPickerOptions {
  /** Element the picker replaces. Its `data-testid` is inherited by the root. */
  mount: HTMLElement;
  grinders: Grinder[];
  selectedId: string;
  /** Accessible name, e.g. "Source grinder". */
  label: string;
  onSelect: (id: string) => void;
}

export interface GrinderPicker {
  setSelected(id: string): void;
  getSelected(): string;
  setRecents(ids: string[]): void;
}

export function createGrinderPicker(options: GrinderPickerOptions): GrinderPicker {
  const { mount, grinders, label, onSelect } = options;
  const field = mount.dataset.testid ?? 'grinder';
  let selectedId = options.selectedId;
  let recentIds: string[] = [];

  const root = document.createElement('div');
  root.className = 'picker';
  root.dataset.testid = field;
  root.dataset.value = selectedId;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'picker__button';
  button.dataset.testid = `${field}-button`;
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', label);

  const panel = document.createElement('div');
  panel.className = 'picker__panel';
  panel.hidden = true;

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'picker__search';
  search.dataset.testid = `${field}-search`;
  search.placeholder = 'Search grinders';
  search.setAttribute('aria-label', `Search ${label.toLowerCase()}`);

  const list = document.createElement('ul');
  list.className = 'picker__list';
  list.dataset.testid = `${field}-list`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);

  panel.append(search, list);
  root.append(button, panel);
  mount.replaceWith(root);

  function nameOf(id: string): string {
    const grinder = grinders.find((g) => g.id === id);
    return grinder ? displayName(grinder) : id;
  }

  function renderButton(): void {
    button.textContent = nameOf(selectedId);
    root.dataset.value = selectedId;
  }

  function optionRow(grinder: Grinder): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'picker__option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(grinder.id === selectedId));
    item.dataset.id = grinder.id;
    item.textContent = displayName(grinder);
    item.addEventListener('click', () => choose(grinder.id));
    return item;
  }

  function renderList(): void {
    const query = search.value.trim();
    const matches = query ? searchGrinders(query) : grinders;

    if (matches.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'picker__empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = 'No grinders match';
      list.replaceChildren(empty);
      return;
    }

    list.replaceChildren(...matches.map(optionRow));
  }

  function open(): void {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    search.value = '';
    renderList();
    search.focus();
  }

  function close(): void {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  function choose(id: string): void {
    selectedId = id;
    renderButton();
    close();
    button.focus();
    onSelect(id);
  }

  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  search.addEventListener('input', renderList);

  // A click anywhere else dismisses the panel, matching how a native select behaves.
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !root.contains(event.target as Node)) close();
  });

  renderButton();

  return {
    setSelected(id) {
      selectedId = id;
      renderButton();
    },
    getSelected: () => selectedId,
    setRecents(ids) {
      recentIds = ids;
    },
  };
}
```

`recentIds` is assigned but unread until Task 4; that is deliberate, and `setRecents` is called from Task 2's popup wiring so the plumbing is exercised early.

- [ ] **Step 5: Replace the selects in the markup**

In `src/ui/popup.html`, replace:

```html
<select class="select" id="from-grinder" data-testid="from-grinder" aria-label="Source grinder"></select>
```

with:

```html
<div id="from-grinder" data-testid="from-grinder"></div>
```

and:

```html
<select class="select" id="to-grinder" data-testid="to-grinder" aria-label="Target grinder"></select>
```

with:

```html
<div id="to-grinder" data-testid="to-grinder"></div>
```

- [ ] **Step 6: Wire the popup**

In `src/ui/popup.ts`:

Change the imports on lines 1-4 to:

```ts
import { convert, formatSetting, settingToMicrons } from '../core/convert.js';
import { DATASET, allGrinders, grinderById } from '../core/dataset.js';
import type { Grinder } from '../core/types.js';
import { createGrinderPicker, type GrinderPicker } from './grinder-picker.js';
import { loadPrefs, pushRecent, savePrefs } from './prefs.js';
```

Replace the two select constants (lines 12-13) with mutable picker handles:

```ts
let fromPicker: GrinderPicker;
let toPicker: GrinderPicker;
let recentIds: string[] = [];
```

Delete `populate()` entirely (lines 33-45).

Replace `currentFrom` and `currentTo`:

```ts
function currentFrom(): Grinder {
  return grinderById(fromPicker.getSelected()) ?? allGrinders()[0]!;
}

function currentTo(): Grinder {
  return grinderById(toPicker.getSelected()) ?? allGrinders()[1] ?? allGrinders()[0]!;
}
```

Replace `persist()`:

```ts
async function persist(): Promise<void> {
  await savePrefs({
    fromId: fromPicker.getSelected(),
    toId: toPicker.getSelected(),
    fromSetting: Number(settingInput.value),
    recentIds,
  });
}
```

Replace the body of `init()` down to and including the `for (const node of ...)` loop with:

```ts
async function init(): Promise<void> {
  datasetMeta.textContent = `${allGrinders().length} grinders · v${DATASET.version}`;

  const grinders = allGrinders();
  const prefs = await loadPrefs();
  recentIds = prefs.recentIds;

  const fromId = (prefs.fromId && grinderById(prefs.fromId)?.id) || grinders[0]!.id;
  const toId = (prefs.toId && grinderById(prefs.toId)?.id) || (grinders[1] ?? grinders[0]!).id;

  const onPick = (id: string) => {
    recentIds = pushRecent(recentIds, id);
    fromPicker.setRecents(recentIds);
    toPicker.setRecents(recentIds);
    render();
    void persist();
  };

  fromPicker = createGrinderPicker({
    mount: document.querySelector<HTMLElement>('#from-grinder')!,
    grinders,
    selectedId: fromId,
    label: 'Source grinder',
    onSelect: onPick,
  });

  toPicker = createGrinderPicker({
    mount: document.querySelector<HTMLElement>('#to-grinder')!,
    grinders,
    selectedId: toId,
    label: 'Target grinder',
    onSelect: onPick,
  });

  fromPicker.setRecents(recentIds);
  toPicker.setRecents(recentIds);

  const from = currentFrom();
  settingInput.value = String(
    prefs.fromSetting ?? Math.round((from.scale.min + from.scale.max) / 2),
  );

  render();

  settingInput.addEventListener('change', () => {
    render();
    void persist();
  });
  settingInput.addEventListener('input', render);

  downBtn.addEventListener('click', () => {
    nudge(-1);
    void persist();
  });
  upBtn.addEventListener('click', () => {
    nudge(1);
    void persist();
  });

  document.body.dataset.ready = 'true';
}
```

- [ ] **Step 7: Add the styles**

Append to `src/ui/popup.css`:

```css
.picker {
  position: relative;
}

.picker__button {
  width: 100%;
  padding: 0.55rem 0.7rem;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--field, #f7f7f7);
  border: 1px solid var(--line, #ddd);
  border-radius: 6px;
  cursor: pointer;
}

.picker__panel {
  position: absolute;
  z-index: 10;
  inset-inline: 0;
  margin-top: 4px;
  background: var(--surface, #fff);
  border: 1px solid var(--line, #ddd);
  border-radius: 6px;
  box-shadow: 0 6px 20px rgb(0 0 0 / 12%);
}

.picker__search {
  width: 100%;
  padding: 0.5rem 0.7rem;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line, #ddd);
}

/* Bounded so a long catalogue scrolls inside the panel instead of stretching
   the popup, which Chrome caps near 600px anyway. */
.picker__list {
  max-height: 260px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.picker__option {
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.picker__option:hover,
.picker__option[data-active='true'] {
  background: var(--field, #f0f0f0);
}

.picker__empty {
  padding: 0.6rem 0.7rem;
  opacity: 0.7;
}
```

If `popup.css` defines its palette with different custom property names, use those instead of the fallbacks above — read the top of the file first.

- [ ] **Step 8: Update the screenshot script**

In `scripts/screenshot.mjs`, replace the three driving lines:

```js
await page.getByTestId('from-grinder').selectOption(state.from);
await page.getByTestId('to-grinder').selectOption(state.to);
```

with:

```js
for (const [field, id] of [['from-grinder', state.from], ['to-grinder', state.to]]) {
  await page.getByTestId(`${field}-button`).click();
  await page.getByTestId(`${field}-search`).fill(id.replace(/-/g, ' '));
  await page.getByTestId(`${field}-list`).locator(`li[data-id="${id}"]`).click();
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm run verify`
Expected: all green — 60+ unit tests, 11 e2e tests.

- [ ] **Step 10: Commit**

```bash
git add src/ui/grinder-picker.ts src/ui/popup.html src/ui/popup.css src/ui/popup.ts \
        tests/e2e/fixtures.ts tests/e2e/converter.spec.ts scripts/screenshot.mjs
git commit -m "feat(ui): searchable grinder picker replacing the native selects"
```

---

### Task 3: Collapsed brand groups in the empty state

**Files:**
- Modify: `src/ui/grinder-picker.ts`
- Modify: `src/ui/popup.css`
- Modify: `tests/e2e/converter.spec.ts`

**Interfaces:**
- Consumes: `createGrinderPicker` (Task 2); `groupByBrand` from `src/core/dataset.js`.
- Produces: group rows `li.picker__group[data-brand="<brand>"]` containing a `button[aria-expanded]`.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/converter.spec.ts`:

```ts
test('shows collapsed brands before anything is typed', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();

  const list = popup.getByTestId('from-grinder-list');
  // Brands are collapsed, so no model rows are visible yet.
  await expect(list.locator('li[role="option"]')).toHaveCount(0);
  await expect(list.locator('li.picker__group')).not.toHaveCount(0);

  await list.locator('li.picker__group[data-brand="Comandante"] button').click();
  await expect(list.locator('li[role="option"]')).not.toHaveCount(0);
  await expect(list).toContainText('C40 MK4 Nitro Blade');
});

test('typing replaces the groups with a flat result list', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  const list = popup.getByTestId('from-grinder-list');

  await popup.getByTestId('from-grinder-search').fill('c40');
  await expect(list.locator('li.picker__group')).toHaveCount(0);
  await expect(list.locator('li[role="option"]')).not.toHaveCount(0);

  // Clearing the query brings the collapsed groups back.
  await popup.getByTestId('from-grinder-search').fill('');
  await expect(list.locator('li[role="option"]')).toHaveCount(0);
  await expect(list.locator('li.picker__group')).not.toHaveCount(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run build && npx playwright test -g "collapsed brands"`
Expected: FAIL — every grinder is rendered flat, so `li[role="option"]` is not 0.

- [ ] **Step 3: Implement**

In `src/ui/grinder-picker.ts`, add `groupByBrand` to the core import:

```ts
import { displayName, groupByBrand, searchGrinders } from '../core/dataset.js';
```

Add a state field beside `recentIds`:

```ts
const expanded = new Set<string>();
```

Add a group row builder above `renderList`:

```ts
function groupRow(brand: string, members: Grinder[]): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'picker__group';
  item.setAttribute('role', 'presentation');
  item.dataset.brand = brand;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'picker__group-toggle';
  toggle.setAttribute('aria-expanded', String(expanded.has(brand)));
  toggle.textContent = `${brand} (${members.length})`;
  toggle.addEventListener('click', () => {
    if (expanded.has(brand)) expanded.delete(brand);
    else expanded.add(brand);
    renderList();
  });

  item.append(toggle);
  return item;
}
```

Replace the body of `renderList` with:

```ts
function renderList(): void {
  const query = search.value.trim();

  if (query) {
    const matches = searchGrinders(query);
    if (matches.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'picker__empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = 'No grinders match';
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(...matches.map(optionRow));
    return;
  }

  // Empty query: one row per brand, expanded ones followed by their models.
  const rows: HTMLLIElement[] = [];
  for (const [brand, members] of groupByBrand(grinders)) {
    rows.push(groupRow(brand, members));
    if (expanded.has(brand)) rows.push(...members.map(optionRow));
  }
  list.replaceChildren(...rows);
}
```

In `open()`, collapse everything so each visit starts short — add before `renderList()`:

```ts
expanded.clear();
```

- [ ] **Step 4: Add the styles**

Append to `src/ui/popup.css`:

```css
.picker__group-toggle {
  display: block;
  width: 100%;
  padding: 0.45rem 0.7rem;
  text-align: left;
  font: inherit;
  font-weight: 600;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

.picker__group-toggle::before {
  content: '▸';
  display: inline-block;
  width: 1em;
  opacity: 0.6;
}

.picker__group-toggle[aria-expanded='true']::before {
  content: '▾';
}

/* Models sit under their brand heading. */
.picker__group + .picker__option,
.picker__option + .picker__option {
  padding-inline-start: 1.7rem;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run verify`
Expected: all green, 13 e2e tests.

Note: `selectGrinder` in `fixtures.ts` still works — it types a query first, which takes the flat-results path.

- [ ] **Step 6: Commit**

```bash
git add src/ui/grinder-picker.ts src/ui/popup.css tests/e2e/converter.spec.ts
git commit -m "feat(ui): collapse the picker to brands until a query is typed"
```

---

### Task 4: Recents section

**Files:**
- Modify: `src/ui/grinder-picker.ts`
- Modify: `src/ui/popup.css`
- Modify: `tests/e2e/converter.spec.ts`

**Interfaces:**
- Consumes: `setRecents` (Task 2), `renderList` and `optionRow` (Tasks 2-3), `pushRecent` (Task 1).
- Produces: a `li.picker__section` heading followed by option rows carrying `data-recent="true"`.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/converter.spec.ts`:

```ts
test('offers recently used grinders on the next open', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', C40);
  await selectGrinder(popup, 'from-grinder', JX_PRO);

  await popup.getByTestId('from-grinder-button').click();
  const list = popup.getByTestId('from-grinder-list');

  await expect(list.locator('li.picker__section')).toContainText('Recent');
  // The current selection is not offered as a shortcut to itself.
  await expect(list.locator(`li[data-recent="true"][data-id="${JX_PRO}"]`)).toHaveCount(0);
  await expect(list.locator(`li[data-recent="true"][data-id="${C40}"]`)).toHaveCount(1);
});

test('hides recents while a query is active', async ({ popup }) => {
  await selectGrinder(popup, 'from-grinder', C40);

  await popup.getByTestId('from-grinder-button').click();
  await popup.getByTestId('from-grinder-search').fill('timemore');
  await expect(popup.getByTestId('from-grinder-list').locator('li.picker__section')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run build && npx playwright test -g "recently used"`
Expected: FAIL — no `li.picker__section` is rendered.

- [ ] **Step 3: Implement**

In `src/ui/grinder-picker.ts`, make `optionRow` able to mark a recent:

```ts
function optionRow(grinder: Grinder, recent = false): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'picker__option';
  item.setAttribute('role', 'option');
  item.setAttribute('aria-selected', String(grinder.id === selectedId));
  item.dataset.id = grinder.id;
  if (recent) item.dataset.recent = 'true';
  item.textContent = displayName(grinder);
  item.addEventListener('click', () => choose(grinder.id));
  return item;
}
```

Add a section-heading builder next to `groupRow`:

```ts
function sectionRow(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'picker__section';
  item.setAttribute('role', 'presentation');
  item.textContent = text;
  return item;
}
```

In `renderList`, insert the recents block at the start of the empty-query branch, immediately before the `for (const [brand, members] of ...)` loop:

```ts
  const rows: HTMLLIElement[] = [];

  // Offering the current selection as a shortcut to itself is noise, and a
  // recent id can name a grinder dropped by a later dataset.
  const recents = recentIds
    .filter((id) => id !== selectedId)
    .map((id) => grinders.find((g) => g.id === id))
    .filter((g): g is Grinder => g !== undefined);

  if (recents.length > 0) {
    rows.push(sectionRow('Recent'));
    rows.push(...recents.map((g) => optionRow(g, true)));
  }

  for (const [brand, members] of groupByBrand(grinders)) {
```

Make `setRecents` re-render when the panel is open, so a selection made in one field updates the other immediately:

```ts
    setRecents(ids) {
      recentIds = ids;
      if (!panel.hidden) renderList();
    },
```

- [ ] **Step 4: Add the styles**

Append to `src/ui/popup.css`:

```css
.picker__section {
  padding: 0.5rem 0.7rem 0.25rem;
  font-size: 0.75em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run verify`
Expected: all green, 15 e2e tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/grinder-picker.ts src/ui/popup.css tests/e2e/converter.spec.ts
git commit -m "feat(ui): surface recently used grinders in the picker"
```

---

### Task 5: Keyboard navigation and ARIA

**Files:**
- Modify: `src/ui/grinder-picker.ts`
- Modify: `tests/e2e/converter.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-4.
- Produces: no new exports. Adds `aria-activedescendant` on the search field and `data-active="true"` on the active row.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/converter.spec.ts`:

```ts
test('selects with the keyboard alone', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').press('Enter');
  await popup.getByTestId('from-grinder-search').fill('c40 mk4');

  await popup.keyboard.press('ArrowDown');
  await popup.keyboard.press('Enter');

  await expect(popup.getByTestId('from-grinder')).toHaveAttribute('data-value', C40);
});

test('Escape closes the panel and returns focus to the button', async ({ popup }) => {
  const button = popup.getByTestId('from-grinder-button');
  await button.click();
  await expect(popup.getByTestId('from-grinder-search')).toBeVisible();

  await popup.keyboard.press('Escape');
  await expect(popup.getByTestId('from-grinder-search')).toBeHidden();
  await expect(button).toBeFocused();
});

test('arrow keys expand a brand group', async ({ popup }) => {
  await popup.getByTestId('from-grinder-button').click();
  await popup.keyboard.press('ArrowDown');
  await popup.keyboard.press('Enter');

  await expect(
    popup.getByTestId('from-grinder-list').locator('li[role="option"]'),
  ).not.toHaveCount(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run build && npx playwright test -g "keyboard alone"`
Expected: FAIL — `ArrowDown` does nothing, so `Enter` selects nothing.

- [ ] **Step 3: Implement**

In `src/ui/grinder-picker.ts`, add an active-row index beside `expanded`:

```ts
let activeIndex = -1;
```

Add navigation helpers above `open()`:

```ts
/** Rows the arrow keys can land on: options and group toggles, in DOM order. */
function navigableRows(): HTMLLIElement[] {
  return [...list.querySelectorAll<HTMLLIElement>('li.picker__option, li.picker__group')];
}

function highlight(index: number): void {
  const rows = navigableRows();
  for (const row of rows) delete row.dataset.active;

  if (rows.length === 0) {
    activeIndex = -1;
    search.removeAttribute('aria-activedescendant');
    return;
  }

  activeIndex = (index + rows.length) % rows.length;
  const row = rows[activeIndex]!;
  row.dataset.active = 'true';
  row.id ||= `${field}-row-${activeIndex}`;
  search.setAttribute('aria-activedescendant', row.id);
  row.scrollIntoView({ block: 'nearest' });
}

function activateRow(): void {
  const row = navigableRows()[activeIndex];
  if (!row) return;
  if (row.dataset.id) choose(row.dataset.id);
  else row.querySelector('button')?.click();
}
```

Reset the highlight whenever the list is rebuilt — append to the end of `renderList`:

```ts
  highlight(0);
```

Wire the keys. Add after the existing `search.addEventListener('input', renderList);`:

```ts
search.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlight(activeIndex + 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlight(activeIndex - 1);
      break;
    case 'Enter':
      event.preventDefault();
      activateRow();
      break;
    case 'Escape':
      event.preventDefault();
      close();
      button.focus();
      break;
    case 'Tab':
      close();
      break;
    default:
  }
});
```

Open on the keys a native select responds to. Replace the button click handler with:

```ts
button.addEventListener('click', () => (panel.hidden ? open() : close()));
button.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    open();
  }
});
```

`Enter` and `Space` already open it: a `<button>` fires `click` for both.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run verify`
Expected: all green, 18 e2e tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/grinder-picker.ts tests/e2e/converter.spec.ts
git commit -m "feat(ui): keyboard navigation for the grinder picker"
```

---

### Task 6: Refresh the screenshots and the README

**Files:**
- Modify: `README.md`
- Regenerate: `docs/screens/*.png`

**Interfaces:**
- Consumes: the finished picker.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Regenerate the screenshots**

Run: `npm run build && node scripts/screenshot.mjs`
Expected: ten PNGs rewritten under `docs/screens/`. Open one and confirm the picker button shows a full name like "Comandante C40 MK4 Nitro Blade" rather than a bare model.

- [ ] **Step 2: Describe the picker in the README**

In `README.md`, immediately after the paragraph beginning "Pick the grinder you know", add:

```markdown
With a catalogue this size the picker is searchable: type a few characters of a
brand or model to narrow it, or browse by brand — groups start collapsed, and
the grinders you used last sit at the top.
```

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/screens
git commit -m "docs: refresh screenshots and describe the searchable picker"
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Combobox replacing both selects | 2 |
| Multi-character search over brand/model/alias | 2 |
| Full names in results | 2 |
| "No grinders match" row | 2 |
| Collapsed brand groups with counts | 3 |
| Query hides groups, clearing restores them collapsed | 3 |
| Recents, shared, capped at 5, excluding current selection | 1, 4 |
| Recents hidden while searching | 4 |
| Keyboard: arrows, Enter, Escape, Tab | 5 |
| `aria-activedescendant`, `role=listbox/option`, `aria-expanded` | 2, 5 |
| Panel bounded and scrollable | 2 (CSS) |
| Click outside closes | 2 |
| Stored id missing from dataset | 2 (`currentFrom`/`currentTo` fallbacks, unchanged) |
| Recents referencing removed grinders filtered | 4 |
| Storage unavailable | 1 (`loadPrefs` already swallows; `recentIds` defaults to `[]`) |
| E2E ported and extended | 2, 3, 4, 5 |
| Screenshot script updated | 2 |

**Type consistency** — `createGrinderPicker` returns `{ setSelected, getSelected, setRecents }`; `popup.ts` calls `getSelected` (in `currentFrom`, `currentTo`, `persist`) and `setRecents` (in `init`, `onPick`). `setSelected` is exported but unused by this plan; it exists so a future caller can drive selection programmatically without reaching into the DOM. `optionRow` gains a second parameter in Task 4 with a default, so Task 3's calls keep compiling.

**Known gap** — `pushRecent`'s limit of 5 is exercised by the unit test but not by an e2e test; six selections in a Playwright run to prove truncation would be slow and would duplicate the unit coverage.
