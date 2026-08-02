/**
 * Списки на хайрлайнах: `Section` (микро-лейбл с чертой под ним) и `Row`
 * (строка списка с чертой под собой).
 *
 * Карточек в этом интерфейсе нет — группировка держится на волосяных линиях
 * четырёх градаций. Заголовок секции отбивается `--line-2`, строки внутри —
 * самой тихой `--line-1`, чтобы список читался как список, а не как таблица.
 */

import type { ReactNode } from 'react';

import './components.css';

/** Голая линия — когда группировать нечего, а отделить надо. */
export function Hairline() {
  return <div className="bj-hairline" />;
}

export interface SectionProps {
  /** Микро-лейбл. Готовая строка из `strings.ts`. */
  label?: string;
  /** Правый угол заголовка: счётчик, подсказка. */
  aside?: ReactNode;
  children?: ReactNode;
}

export function Section({ label, aside, children }: SectionProps) {
  return (
    <section className="bj-section">
      {label === undefined && aside === undefined ? null : (
        <div className="bj-section__head">
          <span className="bj-section__label">{label}</span>
          {aside === undefined ? null : <span className="bj-section__aside">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface RowProps {
  /** Основная строка. */
  label: ReactNode;
  /** Тех-подстрока под ней. */
  sub?: ReactNode;
  /** Правый угол: остаток, счётчик, «→». */
  right?: ReactNode;
  /** Левый угол: фото, чертёж девайса, чекбокс сравнения. */
  lead?: ReactNode;
  onClick?: () => void;
  /** Без нижней черты — для последней строки группы. */
  flush?: boolean;
  /** Метка для сквозного теста (`data-testid`) — см. `InverseButton`. */
  testId?: string;
}

export function Row({ label, sub, right, lead, onClick, flush = false, testId }: RowProps) {
  const cls = flush ? 'bj-row bj-row--flush' : 'bj-row';

  const body = (
    <>
      {lead === undefined ? null : lead}
      <div className="bj-row__main">
        <div className="bj-row__label">{label}</div>
        {sub === undefined ? null : <div className="bj-row__sub">{sub}</div>}
      </div>
      {right === undefined ? null : <div className="bj-row__right">{right}</div>}
    </>
  );

  return onClick === undefined ? (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  ) : (
    <button type="button" className={cls} data-testid={testId} onClick={onClick}>
      {body}
    </button>
  );
}
