/**
 * Инверсная кнопка — единственное светлое пятно интерфейса.
 *
 * Ровно одна на экран: ЗАВАРИТЬ, СТАРТ, ГОТОВО, СОХРАНИТЬ. Если их две, экран
 * не отвечает на вопрос «что здесь главное», поэтому вторую по важности всегда
 * рисуют рамкой, а не заливкой.
 */

import type { ReactNode } from 'react';

import './components.css';

export interface InverseButtonProps {
  children: ReactNode;
  onClick?: () => void;
  /**
   * Ступени макета: `sm` 46px, `md` 52px (по умолчанию), `lg` 54px — главная
   * кнопка экрана, `xl` 58px — «СТАРТ» на сетапе и только он.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  /** Раскладочный класс от экрана: ширина, отступы, `flex`. */
  className?: string;
  /**
   * Метка для сквозного теста (`data-testid`). Отдельным пропом, а не россыпью
   * атрибутов: смоук ходит по кнопкам, у которых нет ни стабильного текста
   * (он меняется с языком), ни стабильного класса.
   */
  testId?: string;
}

const SIZE = {
  sm: ' bj-inverse--sm',
  md: '',
  lg: ' bj-inverse--lg',
  xl: ' bj-inverse--xl',
} as const;

export function InverseButton({
  children,
  onClick,
  size = 'md',
  disabled = false,
  className,
  testId,
}: InverseButtonProps) {
  return (
    <button
      type="button"
      className={`bj-inverse${SIZE[size]}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
