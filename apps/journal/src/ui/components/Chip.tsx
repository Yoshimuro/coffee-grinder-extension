/**
 * Чип-переключатель: фильтры журнала, признаки девайса, режим гибрида.
 *
 * Состояний ровно два, и различаются они только рамкой и цветом текста —
 * заливки нет ни у активного, ни у остальных (`DC:1325`). `ChipRow` рядом
 * держит ленту: на фильтрах она не переносится, а скроллится вбок, потому что
 * пачек может быть сколько угодно.
 */

import type { ReactNode } from 'react';

import './components.css';

export interface ChipProps {
  /** Готовая строка из `strings.ts` или имя пачки. */
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Растянуть на равную долю ряда — конструктор девайса и клапан гибрида. */
  grow?: boolean;
  disabled?: boolean;
}

export function Chip({ label, active = false, onClick, grow = false, disabled = false }: ChipProps) {
  const cls = ['bj-chip', active ? 'bj-chip--on' : '', grow ? 'bj-chip--grow' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export interface ChipRowProps {
  children: ReactNode;
  /** Лента фильтров: не переносится, уезжает вбок. */
  scroll?: boolean;
}

export function ChipRow({ children, scroll = false }: ChipRowProps) {
  return <div className={scroll ? 'bj-chips bj-chips--scroll' : 'bj-chips'}>{children}</div>;
}
