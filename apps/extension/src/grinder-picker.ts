/**
 * The grinder chooser: a button showing the current selection, and a panel with
 * a search field over the catalogue.
 *
 * A native `<select>` cannot do either of the two things this exists for — jump
 * to a grinder on several typed characters, and hide the catalogue behind
 * collapsed brands — because its type-ahead and its `<optgroup>` rendering both
 * belong to the browser.
 */

import { displayName, groupByBrand, searchGrinders, type Grinder } from '@coffee/core';

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

/**
 * How many recents the panel offers.
 *
 * Fewer than the history holds, deliberately: this field's current selection is
 * dropped from its own shortcut list, and the surplus is what backfills the gap
 * so three are still offered.
 */
const RECENTS_SHOWN = 3;

export function createGrinderPicker(options: GrinderPickerOptions): GrinderPicker {
  const { mount, grinders, label, onSelect } = options;
  const field = mount.dataset.testid ?? 'grinder';
  let selectedId = options.selectedId;
  let recentIds: string[] = [];
  const expanded = new Set<string>();
  let activeIndex = -1;

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

  function sectionRow(text: string): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'picker__section';
    item.setAttribute('role', 'presentation');
    item.textContent = text;
    return item;
  }

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

  function renderList(): void {
    list.replaceChildren(...buildRows());
    // The list was just rebuilt, so any previous highlight points at a detached
    // node; start again from the top.
    highlight(0);
  }

  function buildRows(): HTMLLIElement[] {
    const query = search.value.trim();

    if (query) {
      const matches = searchGrinders(query);
      if (matches.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'picker__empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = 'No grinders match';
        return [empty];
      }
      return matches.map((g) => optionRow(g));
    }

    const rows: HTMLLIElement[] = [];

    // Offering the current selection as a shortcut to itself is noise, and a
    // stored id can name a grinder a later dataset dropped.
    const recents = recentIds
      .filter((id) => id !== selectedId)
      .map((id) => grinders.find((g) => g.id === id))
      .filter((g): g is Grinder => g !== undefined)
      .slice(0, RECENTS_SHOWN);

    if (recents.length > 0) {
      rows.push(sectionRow('Recent'));
      rows.push(...recents.map((g) => optionRow(g, true)));
    }

    // Then one row per brand, and the models of whichever are expanded.
    // 42 rows instead of 134 is the difference between scanning and scrolling.
    for (const [brand, members] of groupByBrand(grinders)) {
      rows.push(groupRow(brand, members));
      if (expanded.has(brand)) rows.push(...members.map((g) => optionRow(g)));
    }
    return rows;
  }

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
    if (!row.id) row.id = `${field}-row-${activeIndex}`;
    search.setAttribute('aria-activedescendant', row.id);
    row.scrollIntoView({ block: 'nearest' });
  }

  function activateRow(): void {
    const row = navigableRows()[activeIndex];
    if (!row) return;
    if (row.dataset.id) choose(row.dataset.id);
    else row.querySelector('button')?.click();
  }

  function open(): void {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    search.value = '';
    // Every visit starts short; a group left open from last time would defeat
    // the point of collapsing them.
    expanded.clear();
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

  // Enter and Space already open it: a <button> fires click for both.
  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open();
    }
  });

  search.addEventListener('input', renderList);

  // Focus stays in the search field throughout — the active row is advertised
  // with aria-activedescendant instead, so typing is never interrupted.
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

  // A click anywhere else dismisses the panel, the way a native select does.
  //
  // The path is read rather than `root.contains(event.target)`: expanding a
  // group re-renders the list while the click is still bubbling, which detaches
  // the very button that was clicked. `contains` then answers false for a node
  // that was inside the panel a moment ago, and the panel closes on its own.
  // `composedPath()` is captured at dispatch, so it still names the real
  // ancestors.
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !event.composedPath().includes(root)) close();
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
      // A pick in the other field changes this one's history while it is open.
      if (!panel.hidden) renderList();
    },
  };
}
