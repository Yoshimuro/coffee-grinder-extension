/**
 * Пустое состояние — одна приглушённая строка.
 *
 * Объясняет, чего пока нет, и подсказывает следующий шаг обычным языком.
 * Текст остаётся строчным, без точки в конце, и переносится на узком экране.
 */

import './components.css';

export interface EmptyStateProps {
  /** Готовая строка из `strings.ts`. */
  text: string;
  /**
   * Делает строку кнопкой: пунктирная рамка, капс, тач-таргет 48px. Так
   * выглядят «+ ЗЕРНО», «+ ДЕВАЙС», «+ КОФЕМОЛКА» — приглашение, а не сводка.
   */
  onClick?: () => void;
}

export function EmptyState({ text, onClick }: EmptyStateProps) {
  return onClick === undefined ? (
    <div className="bj-empty">{text}</div>
  ) : (
    <button type="button" className="bj-empty bj-empty--action" onClick={onClick}>
      {text}
    </button>
  );
}
