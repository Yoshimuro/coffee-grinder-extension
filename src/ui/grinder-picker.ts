/**
 * The grinder chooser: a button showing the current selection, and a panel with
 * a search field over the catalogue.
 *
 * A native `<select>` cannot do either of the two things this exists for — jump
 * to a grinder on several typed characters, and hide the catalogue behind
 * collapsed brands — because its type-ahead and its `<optgroup>` rendering both
 * belong to the browser.
 */

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

  // A click anywhere else dismisses the panel, the way a native select does.
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
