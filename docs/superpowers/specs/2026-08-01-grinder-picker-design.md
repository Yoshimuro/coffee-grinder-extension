# Grinder picker

## Problem

The popup picks grinders with two native `<select>` elements, each holding every
grinder grouped by brand. At 134 grinders across 42 brands that is 176 rows to
scroll, and a native select only offers first-character type-ahead, so there is
no way to jump to "Chestnut S3" by typing.

Observed usage: the target grinder ("To") is the user's own, chosen once and
rarely changed. The source grinder ("From") is whatever a recipe happens to
mention, so it changes constantly and is usually known by name.

## Goals

- Find a grinder by typing several characters of its brand, model or alias.
- Show a short list before anything is typed, not all 176 rows.
- Same control in both fields.

## Non-goals

- Fuzzy or typo-tolerant matching. Substring matching over brand, model and
  aliases is what `searchGrinders` already does and it is enough.
- Favourites, pinning or reordering. Recents cover the same need without new UI.
- Any change to conversion, calibration or the dataset.

## Approach

Replace both `<select>` elements with a custom combobox: a button showing the
current selection, opening a panel that holds a search field and a list.

Rejected alternatives:

- **A search field above a native select.** Keeps native keyboard and
  accessibility, but native `<optgroup>` cannot collapse, so the list stays 176
  rows long — which is the actual complaint. Two controls per field also crowd a
  340 px popup.
- **`<input list>` with `<datalist>`.** Nearly free, but offers no grouping, no
  recents, no styling, and forces mapping a display string back to an id. With
  134 similarly-named entries that mapping is ambiguous.

## Components

### `src/ui/grinder-picker.ts` (new)

Self-contained widget. Knows about grinders and selection; knows nothing about
conversion, microns or settings.

```ts
export interface GrinderPickerOptions {
  mount: HTMLElement;
  grinders: Grinder[];
  selectedId: string;
  recentIds: string[];
  label: string;                  // accessible name, e.g. "Source grinder"
  onSelect: (id: string) => void;
}

export interface GrinderPicker {
  setSelected(id: string): void;
  setRecents(ids: string[]): void;
}

export function createGrinderPicker(options: GrinderPickerOptions): GrinderPicker;
```

### `src/ui/prefs.ts` (extended)

`Prefs` gains `recentIds: string[]`. The storage key stays `cgc.prefs.v1`:
`loadPrefs` already merges over `DEFAULT_PREFS`, so an older stored object
without the field reads back as an empty list. No migration.

A pure helper lives here because it is the only new logic worth testing on its
own:

```ts
export function pushRecent(recents: string[], id: string, limit = 5): string[];
```

Moves `id` to the front, removes any earlier occurrence, truncates to `limit`.

### `src/ui/popup.ts` (modified)

Creates the two pickers and reacts to `onSelect` exactly where it reacts to the
select's `change` event today. `populate()` is deleted — the widget owns
rendering.

### `src/core/*` (untouched)

`searchGrinders`, `groupByBrand` and `displayName` already exist and are tested.
The core stays free of DOM and `chrome.*`.

## Markup

```html
<div class="picker" data-testid="from-grinder">
  <button class="picker__button" aria-haspopup="listbox" aria-expanded="false">
    <span class="picker__value">Comandante C40 MK4 Nitro Blade</span>
  </button>
  <div class="picker__panel" hidden>
    <input class="picker__search" type="search" role="combobox"
           aria-controls="from-grinder-list" aria-expanded="true" />
    <ul class="picker__list" id="from-grinder-list" role="listbox">
      <li class="picker__section" role="presentation">Recent</li>
      <li class="picker__option" role="option" data-id="timemore-s3">Timemore Chestnut S3</li>
      <li class="picker__group" role="presentation">
        <button aria-expanded="false">Baratza <span>4</span></button>
      </li>
    </ul>
  </div>
</div>
```

`data-testid` stays on the wrapper so existing test selectors keep resolving to
the right field.

## Behaviour

**Closed.** The button shows `displayName(selected)` — brand and model. Today
the option text is the model alone, which reads as "Zero" or "P64"; across 42
brands that is not enough to identify a grinder.

**Open, empty query.** Recents first (up to 5, excluding whatever is already
selected in that field), then every brand as a collapsed row with its model
count. 42 rows plus recents instead of 176.

**Open, with a query.** Both the group rows and the Recent section disappear —
the panel becomes one flat list of full names from `searchGrinders(query)`, so a
match is identifiable without its group header and there is only ever one list to
arrow through. No matches renders one row reading "No grinders match" rather than
an empty panel. Clearing the query restores the collapsed view, with every group
collapsed again.

**Selection** closes the panel, updates the button, calls `onSelect`, and returns
focus to the button.

**Clicking the button while open** closes the panel, as does clicking outside it.

### Keyboard

| Key | Where | Effect |
| --- | --- | --- |
| `Enter`, `Space`, `ArrowDown` | button | open, focus the search field |
| `ArrowDown` / `ArrowUp` | search field | move the active row through what is visible |
| `Enter` | active option | select it |
| `Enter` | active group | expand or collapse it |
| `Escape` | anywhere in the panel | close, focus the button |
| `Tab` | anywhere in the panel | close, let focus move on |

The active row is tracked with `aria-activedescendant`; focus itself stays in
the search field so typing never breaks.

### Recents

Written on selection, in `popup.ts`, via `pushRecent`. Shared between the two
fields rather than kept per-field: the "To" grinder is chosen once, so a
per-field list for it would hold a single entry that is already displayed on the
button.

## Layout

The popup is 340 px wide and Chrome caps its height near 600 px. The panel is
positioned under the button, `max-height` bounded with `overflow-y: auto`, so a
long list scrolls inside the panel instead of stretching the popup. The search
field stays pinned above the scrolling list.

## Error handling

| Case | Behaviour |
| --- | --- |
| Query matches nothing | One "No grinders match" row |
| Stored id absent from the dataset | Falls back to the first grinder, as today |
| `chrome.storage` unavailable | Recents section is omitted; everything else works |
| Recents referencing removed grinders | Filtered out when rendering |

## Testing

**Unit** — `pushRecent`: moves an existing id to the front without duplicating,
truncates at the limit, leaves an empty list valid.

**E2E** — the eight existing specs drive `getByTestId('from-grinder')
.selectOption(id)`, which only works on a `<select>`. Each becomes open → type →
click. That is not merely a port: it puts the picker itself under test, which
the current suite never touches.

New specs:

- typing several characters narrows the list, and matches a model mid-string
- a collapsed brand expands to reveal its models
- a grinder used once appears under Recent on the next open
- `Escape` closes the panel and restores focus to the button
- arrow keys plus `Enter` select without the mouse

`scripts/screenshot.mjs` drives the same selectors and needs the same change.

## Out of scope

Search over the target field's *result* (i.e. filtering by achievable micron
range), multi-select, and any dataset change.
