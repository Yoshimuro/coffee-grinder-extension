/**
 * Пикер «ОТКУДА»: кнопка с текущим значением и панель поиска под ней.
 *
 * Поведение — из расширения (`extension-report` §5). Собственный виджет, а не
 * `<select>`: нативный список не умеет ни поиска по нескольким символам, ни
 * схлопнутых групп, а 134 записи без того и другого — стена.
 *
 * Клавиатура здесь ограничена Escape и Enter по строке: стрелочная навигация
 * расширения держалась на `aria-activedescendant` и ручном списке узлов, что в
 * React-дереве переписывается целиком, а телефон — основная мишень приложения
 * (BJ-7). Строки — настоящие кнопки, поэтому Tab и VoiceOver работают.
 */

import { useEffect, useRef, useState } from 'react';

import { STR } from '../../../data/strings.js';
import { useLang } from '../../../db/repo/settings.js';
import { type PickerRow, pickerRows, rowName, toggleBrand } from './picker.js';
import './conv.css';

export interface GrinderPickerProps {
  /** Что показано на кнопке. */
  name: string;
  /** Выбранный id — по нему строка получает левую рамку. */
  selected: string | null;
  /** Недавние id из настроек. */
  recents: readonly string[];
  onPick: (id: string) => void;
}

export function GrinderPicker({ name, selected, recents, onPick }: GrinderPickerProps) {
  const lang = useLang();
  const t = STR[lang];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set<string>());
  const searchRef = useRef<HTMLInputElement>(null);

  /* Открытие всегда начинает с чистого листа: запрос пуст, все бренды схлопнуты
     (`open()` расширения делает ровно это). Иначе панель открывается в чужом
     состоянии от прошлого раза и выглядит сломанной. */
  const toggle = () => {
    setOpen((was) => {
      if (was) return false;
      setQuery('');
      setExpanded(new Set<string>());
      return true;
    });
  };

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    onPick(id);
  };

  const rows = open
    ? pickerRows({
        query,
        recents,
        selected,
        expanded,
        recentLabel: t.conv_recent,
        emptyLabel: t.conv_none,
      })
    : [];

  return (
    <div className="conv-picker">
      <button
        type="button"
        className="conv-picker__button"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="conv-picker__name">{name}</span>
        <span className="conv-picker__caret">▾</span>
      </button>

      {open ? (
        <div className="conv-picker__panel">
          <input
            ref={searchRef}
            className="conv-picker__search"
            type="search"
            value={query}
            placeholder={t.conv_search}
            aria-label={t.conv_from}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <ul className="conv-picker__list">
            {rows.map((row) => (
              <li key={row.key}>
                <PickerLine
                  row={row}
                  onPick={pick}
                  onToggleBrand={(brand) => setExpanded((was) => toggleBrand(was, brand))}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface PickerLineProps {
  row: PickerRow;
  onPick: (id: string) => void;
  onToggleBrand: (brand: string) => void;
}

function PickerLine({ row, onPick, onToggleBrand }: PickerLineProps) {
  if (row.kind === 'label') return <div className="conv-picker__label">{row.text}</div>;
  if (row.kind === 'empty') return <div className="conv-picker__empty">{row.text}</div>;

  if (row.kind === 'brand') {
    return (
      <button
        type="button"
        className="conv-picker__row conv-picker__row--brand"
        aria-expanded={row.open}
        onClick={() => onToggleBrand(row.brand)}
      >
        <span className="conv-picker__title">{row.brand}</span>
        <span className="conv-picker__meta">
          {row.count} {row.open ? '−' : '+'}
        </span>
      </button>
    );
  }

  const { grinder } = row;
  const cls = [
    'conv-picker__row',
    row.selected ? 'conv-picker__row--on' : '',
    row.indent ? 'conv-picker__row--in' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      aria-pressed={row.selected}
      onClick={() => onPick(grinder.id)}
    >
      <span className="conv-picker__title">{rowName(grinder)}</span>
      <span className="conv-picker__meta">
        {grinder.scale.min}–{grinder.scale.max}
      </span>
    </button>
  );
}
