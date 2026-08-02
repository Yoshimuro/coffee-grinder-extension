/**
 * Пустое состояние — одна приглушённая строка.
 *
 * Пустой экран здесь не извиняется и не объясняет, чего не хватает: он называет
 * следующее действие («Журнал пуст. Заварить первую чашку») и на этом
 * заканчивается. Никаких иллюстраций и восклицательных знаков — README, тон.
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
